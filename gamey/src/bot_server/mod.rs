pub mod error;
pub mod play;
pub mod state;
pub mod version;

use axum::response::IntoResponse;
use chrono::Utc;
use std::sync::Arc;
use std::str::FromStr;
use futures::stream::StreamExt;
use mongodb::bson::doc;
use serde::Deserialize;
use utoipa::OpenApi;

pub use error::ErrorResponse;
pub use play::{PlayRequest, PlayResponse, play};
pub use version::*;

use crate::{BotDifficulty, GameYError, YEN, state::AppState};
use crate::bot::{
    pro_bot::ProBot, random::RandomBot, ybot_registry::YBotRegistry
};

// --- ESTRUCTURAS ---

#[derive(Deserialize, utoipa::ToSchema)]
pub struct MoveRequest {
    pub index: u32,
    pub player: String,
}

#[derive(Deserialize)]
pub struct HistoryQuery {
    pub username: String,
    pub page: Option<u64>,
    pub limit: Option<i64>,
    pub result: Option<String>,
}

#[derive(Deserialize)]
pub struct StatsQuery {
    pub username: String,
}

#[derive(Deserialize, utoipa::ToSchema)]
pub struct ResetRequest {
    pub size: Option<u32>,
    pub difficulty: Option<String>,
    pub player: Option<String>,
}

#[derive(Deserialize)]
pub struct SurrenderRequest {
    pub player: String,
    pub difficulty: String,
    pub board_size: i32,
}

#[derive(Deserialize)]
pub struct PvpResetRequest {
    pub match_id: String,
    pub size: Option<u32>,
    pub players: Vec<String>,
}

#[derive(Deserialize)]
pub struct PvpMoveRequest {
    pub match_id: String,
    pub player: String,
    pub index: u32,
}

#[derive(serde::Serialize)]
pub struct UserStats {
    pub wins: i64,
    pub losses: i64,
    pub total: i64,
    pub total_score: i64,
}

#[derive(serde::Serialize, serde::Deserialize, utoipa::ToSchema)]
pub struct GameRecord {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = Option<String>)]
    pub id: Option<mongodb::bson::oid::ObjectId>,
    pub date: String,
    pub opponent: String,
    pub board_size: u32,
    pub difficulty: String,
    pub result: String,
}

// --- LÓGICA DE NORMALIZACIÓN (NUEVA) ---

fn normalize_history_result(raw: &str) -> &'static str {
    let stripped: String = raw
        .trim()
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric())
        .map(|ch| ch.to_ascii_lowercase())
        .collect();

    match stripped.as_str() {
        "victoria" | "victory" | "win" | "won" | "ganado" | "youwin" | "hasganado" => "Victoria",
        _ => "Derrota",
    }
}

fn normalize_history_document(record: &mut serde_json::Value) {
    if let Some(obj) = record.as_object_mut() {
        if let Some(result) = obj.get("result").and_then(|v| v.as_str()) {
            obj.insert("result".to_string(), serde_json::json!(normalize_history_result(result)));
        }
    }
}

// --- SWAGGER ---

#[derive(OpenApi)]
#[openapi(
    paths(play::play, reiniciar_juego, realizar_movimiento, obtener_historial),
    components(schemas(PlayRequest, PlayResponse, YEN, ResetRequest, MoveRequest, GameRecord, ErrorResponse)),
    tags((name = "Bot", description = "Endpoints para jugar contra la IA"))
)]
pub struct ApiDoc;

// --- ROUTER ---

pub fn create_router(state: AppState) -> axum::Router {
    axum::Router::new()
        .merge(utoipa_swagger_ui::SwaggerUi::new("/swagger-ui")
            .url("/api-docs/openapi.json", ApiDoc::openapi()))
        .route("/status", axum::routing::get(status))
        .route("/execute-move", axum::routing::post(realizar_movimiento))
        .route("/history", axum::routing::get(obtener_historial))
        .route("/reset", axum::routing::post(reiniciar_juego))
        .route("/difficulties", axum::routing::get(listar_dificultades))
        .route("/surrender", axum::routing::post(rendirse))
        .route("/stats", axum::routing::get(obtener_estadisticas))
        .route("/pvp/reset", axum::routing::post(reiniciar_juego_pvp))
        .route("/pvp/move", axum::routing::post(realizar_movimiento_pvp))
        .route("/api/play", axum::routing::post(play::play))
        .with_state(state)
}

// --- HANDLERS (FUSIÓN DIRECTA) ---

#[utoipa::path(
    post,
    path = "/execute-move",
    request_body = MoveRequest,
    responses((status = 200, description = "Movimiento realizado correctamente")),
    tag = "Bot"
)]
pub async fn realizar_movimiento(
    axum::extract::State(state): axum::extract::State<AppState>,
    axum::extract::Json(payload): axum::extract::Json<MoveRequest>,
) -> impl IntoResponse {
    let session = state.get_or_create_session(&payload.player).await;
    let mut game = session.game.lock().await;
    let diff_str = session.current_difficulty.lock().await.to_string();
    let bot_name = session.active_bot.lock().await.clone();

    let b_size = game.board_size();
    let coords = crate::Coordinates::from_index(payload.index, b_size);
    let _ = game.add_move(crate::Movement::Placement { player: crate::PlayerId::new(0), coords });

    if !game.check_game_over() {
        if let Some(bot) = state.bots().find(&bot_name) {
            if let Some(bot_coords) = bot.choose_move(&*game) {
                let _ = game.add_move(crate::Movement::Placement { player: crate::PlayerId::new(1), coords: bot_coords });
            }
        }
    }

    let winner_id = match game.status() {
        crate::core::game::GameStatus::Finished { winner } => Some(winner.id()),
        _ => None,
    };

    let mut final_score = 0;
    if let Some(wid) = winner_id {
        let mult = match diff_str.as_str() { "Medium" => 2.0, "Hard" => 3.0, _ => 1.0 };
        final_score = if wid == 0 { (100.0 * mult * (b_size as f32 / 6.0)) as i32 } else { 0 };

        let db = state.db.clone();
        let p_name = payload.player.clone();
        let b_name = bot_name.clone();
        let d_str = diff_str.clone();

        tokio::spawn(async move {
            let collection = db.collection::<serde_json::Value>("partidas");
            let result_raw = if wid == 0 { "Victoria" } else { "Derrota" };
            let record = serde_json::json!({
                "player": p_name,
                "date": Utc::now().to_rfc3339(),
                "opponent": b_name,
                "board_size": b_size,
                "difficulty": d_str,
                "result": normalize_history_result(result_raw),
                "score": final_score
            });
            let _ = collection.insert_one(record).await;
        });
    }

    axum::Json(serde_json::json!({ "board": YEN::from(&*game), "winner": winner_id, "score": final_score }))
}

#[utoipa::path(
    post,
    path = "/reset",
    request_body = ResetRequest,
    responses((status = 200, description = "Tablero reiniciado correctamente", body = YEN)),
    tag = "Bot"
)]
pub async fn reiniciar_juego(
    axum::extract::State(state): axum::extract::State<AppState>,
    axum::extract::Json(payload): axum::extract::Json<ResetRequest>,
) -> impl IntoResponse {
    let session = state.get_or_create_session(payload.player.as_deref().unwrap_or("default")).await;
    let mut game = session.game.lock().await;
    let size = payload.size.unwrap_or(5).clamp(3, 20);
    *game = crate::core::game::GameY::new(size);

    if let Some(d) = payload.difficulty {
        if let Ok(diff) = BotDifficulty::from_str(&d) {
            *session.current_difficulty.lock().await = diff;
            if let Some(b) = state.bots().get_random_bot_by_difficulty(diff) {
                *session.active_bot.lock().await = b.name().to_string();
            }
        }
    }
    axum::Json(YEN::from(&*game))
}

#[utoipa::path(
    get,
    path = "/history",
    params(
        ("username" = String, Query, description = "Nombre del usuario"),
        ("page" = Option<u64>, Query, description = "Pagina solicitada"),
        ("limit" = Option<i64>, Query, description = "Numero maximo de partidas"),
        ("result" = Option<String>, Query, description = "Filtro de resultado")
    ),
    responses((status = 200, description = "Historial paginado")),
    tag = "Bot"
)]
pub async fn obtener_historial(
    axum::extract::State(state): axum::extract::State<AppState>,
    axum::extract::Query(params): axum::extract::Query<HistoryQuery>,
) -> impl IntoResponse {
    let collection = state.db.collection::<serde_json::Value>("partidas");
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(10).clamp(1, 100);

    let mut filter = doc! { "player": &params.username };
    if let Some(res) = &params.result { filter.insert("result", normalize_history_result(res)); }

    let total = collection.count_documents(filter.clone()).await.unwrap_or(0);
    let options = mongodb::options::FindOptions::builder()
        .sort(doc! { "date": -1 }).skip((page - 1) * (limit as u64)).limit(limit).build();

    let mut cursor = collection.find(filter).with_options(options).await.unwrap();
    let mut data = Vec::new();
    while let Some(Ok(mut doc)) = cursor.next().await {
        normalize_history_document(&mut doc);
        data.push(doc);
    }

    axum::Json(serde_json::json!({
        "data": data, "total": total, "page": page, "limit": limit,
        "total_pages": (total as f64 / limit as f64).ceil() as u64
    }))
}

pub async fn obtener_estadisticas(
    axum::extract::State(state): axum::extract::State<AppState>,
    axum::extract::Query(params): axum::extract::Query<StatsQuery>,
) -> impl IntoResponse {
    let collection = state.db.collection::<serde_json::Value>("partidas");
    let filter = doc! { "player": &params.username };

    let mut cursor = collection.find(filter.clone()).await.unwrap();
    let mut total_score = 0i64;
    while let Some(Ok(doc)) = cursor.next().await {
        total_score += doc.get("score").and_then(|v| v.as_i64()).unwrap_or(0);
    }

    let wins = collection.count_documents(doc!{"player": &params.username, "result": "Victoria"}).await.unwrap_or(0);
    let losses = collection.count_documents(doc!{"player": &params.username, "result": "Derrota"}).await.unwrap_or(0);

    axum::Json(UserStats { wins: wins as i64, losses: losses as i64, total: (wins + losses) as i64, total_score })
}

// --- PVP HANDLERS ---

pub async fn reiniciar_juego_pvp(
    axum::extract::State(state): axum::extract::State<AppState>,
    axum::extract::Json(payload): axum::extract::Json<PvpResetRequest>,
) -> impl IntoResponse {
    let size = payload.size.unwrap_or(6).clamp(3, 20);
    let session = state.upsert_pvp_session(&payload.match_id, size, payload.players.clone());
    axum::Json(serde_json::json!({ "board": YEN::from(&*session.game.lock().await), "next_turn": payload.players[0] }))
}

pub async fn realizar_movimiento_pvp(
    axum::extract::State(state): axum::extract::State<AppState>,
    axum::extract::Json(payload): axum::extract::Json<PvpMoveRequest>,
) -> impl IntoResponse {
    let Some(session) = state.get_pvp_session(&payload.match_id) else {
        return axum::Json(serde_json::json!({"error": "No match"})).into_response();
    };

    let players = session.players.lock().await.clone();
    let Some(p_idx) = players.iter().position(|p| p == &payload.player) else {
        return axum::Json(serde_json::json!({"error": "Player not in match"})).into_response();
    };
    let mut game = session.game.lock().await;

    let coords = crate::Coordinates::from_index(payload.index, game.board_size());
    let _ = game.add_move(crate::Movement::Placement { player: crate::PlayerId::new(p_idx as u32), coords });

    let winner_name = match game.status() {
        crate::core::game::GameStatus::Finished { winner } => Some(players[winner.id() as usize].clone()),
        _ => None,
    };
    if let Some(winner) = &winner_name {
        let collection = state.db.collection::<serde_json::Value>("partidas");
        for player in &players {
            let opponent = players.iter().find(|candidate| *candidate != player).cloned().unwrap_or_default();
            let result = if player == winner { "Victoria" } else { "Derrota" };
            let record = serde_json::json!({
                "player": player,
                "date": Utc::now().to_rfc3339(),
                "opponent": opponent,
                "board_size": game.board_size(),
                "difficulty": "Multiplayer",
                "result": result,
                "score": if player == winner { 100 } else { 0 }
            });
            let _ = collection.insert_one(record).await;
        }
    }
    let next_turn = if winner_name.is_some() {
        serde_json::Value::Null
    } else {
        serde_json::json!(players[(p_idx + 1) % players.len()])
    };

    axum::Json(serde_json::json!({ "board": YEN::from(&*game), "winner": winner_name, "next_turn": next_turn })).into_response()
}

// Endpoints básicos
pub async fn status() -> impl IntoResponse { "OK" }
pub async fn listar_dificultades() -> impl IntoResponse {
    axum::Json(BotDifficulty::all().iter().map(|d| d.to_string()).collect::<Vec<_>>())
}
pub async fn rendirse(axum::extract::State(state): axum::extract::State<AppState>, axum::extract::Json(payload): axum::extract::Json<SurrenderRequest>) -> impl IntoResponse {
    let record = serde_json::json!({ "player": payload.player, "date": Utc::now().to_rfc3339(), "result": "Derrota", "score": 0 });
    let _ = state.db.collection::<serde_json::Value>("partidas").insert_one(record).await;
    axum::Json(serde_json::json!({ "status": "ok" }))
}

pub async fn run_bot_server(port: u16) -> Result<(), GameYError> {
    let uri = std::env::var("MONGODB_URI").unwrap_or_default();
    let client = mongodb::Client::with_uri_str(uri).await.map_err(|e| GameYError::ServerError { message: e.to_string() })?;
    let db = client.database("gamey_db");
    let bots = YBotRegistry::new().with_bot(Arc::new(RandomBot)).with_bot(Arc::new(ProBot));
    let state = AppState::new(bots, db);
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port)).await.unwrap();
    axum::serve(listener, create_router(state)).await.map_err(|e| GameYError::ServerError { message: e.to_string() })
}
