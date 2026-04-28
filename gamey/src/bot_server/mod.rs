// This module defines how the server works when there are visitors.

//! HTTP server for Y game bots.
//!
//! This module provides an Axum-based REST API for querying Y game bots.
//! The server exposes endpoints for checking bot status and requesting moves.
//!
//! # Endpoints
//! - `GET /status` - Health check endpoint
//! - `POST /{api_version}/ybot/choose/{bot_id}` - Request a move from a bot
//!
//! # Example
//! ```no_run
//! use gamey::run_bot_server;
//!
//!
//! #[tokio::main]
//! async fn main() {
//!     if let Err(e) = run_bot_server(4000).await {
//!         eprintln!("Server error: {}", e);
//!     }
//! }
//! ```

pub mod error;
pub mod play;
pub mod state;
pub mod version;

use axum::response::IntoResponse;
use axum_prometheus::PrometheusMetricLayer;
use chrono::Utc;
use futures::stream::StreamExt;
use mongodb::bson::doc;
use serde::Deserialize;
use std::str::FromStr;
use std::sync::Arc;
use utoipa::OpenApi;

use axum_server::tls_rustls::RustlsConfig;
pub use error::ErrorResponse;
pub use play::{PlayRequest, PlayResponse, play};
use std::net::SocketAddr;
use std::path::PathBuf;
pub use version::*;

use crate::bot::{
    attacker_bot::AttackerBot, blocker_bot::BlockerBot, edge_bot::EdgeBot, pro_bot::ProBot,
    random::RandomBot, ybot_registry::YBotRegistry,
};
use crate::{BotDifficulty, GameYError, YEN, state::AppState};

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
        "victoria" | "victory" | "win" | "won" | "ganado" | "youwin" | "hasganado" | "ganhaste" => {
            "Victoria"
        }
        _ => "Derrota",
    }
}

fn normalize_history_document(record: &mut serde_json::Value) {
    if let Some(obj) = record.as_object_mut() {
        if let Some(result) = obj.get("result").and_then(|v| v.as_str()) {
            obj.insert(
                "result".to_string(),
                serde_json::json!(normalize_history_result(result)),
            );
        }
        if let Some(result_label) = obj.get("result_label").and_then(|v| v.as_str()) {
            obj.insert(
                "result_label".to_string(),
                serde_json::json!(normalize_history_result(result_label)),
            );
        }
    }
}

fn empty_history_response(page: u64, limit: i64) -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({
        "data": [],
        "total": 0,
        "page": page,
        "limit": limit,
        "total_pages": 0
    }))
}

// --- SWAGGER ---

#[derive(utoipa::OpenApi)]
#[openapi(
    paths(play::play, play::list_bots),
    components(schemas(
        play::PlayRequest,
        play::PlayResponse,
        YEN,
        ResetRequest,
        MoveRequest,
        GameRecord,
        error::ErrorResponse
    )),
    tags((name = "Bot", description = "Endpoints para jugar contra la IA"))
)]
pub struct ApiDoc;

// --- ROUTER ---

fn base_router(state: AppState) -> axum::Router {
    axum::Router::new()
        .merge(
            utoipa_swagger_ui::SwaggerUi::new("/swagger-ui")
                .url("/api-docs/openapi.json", ApiDoc::openapi()),
        )
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
        .route("/api/bots", axum::routing::get(play::list_bots))
        .with_state(state)
}

pub fn create_router(state: AppState) -> axum::Router {
    base_router(state)
}

fn create_router_with_metrics(state: AppState) -> axum::Router {
    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();

    base_router(state)
        .route(
            "/metrics",
            axum::routing::get(|| async move { metric_handle.render() }),
        )
        .layer(prometheus_layer)
}

// --- HANDLERS (FUSIÓN DIRECTA) ---

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
    let _ = game.add_move(crate::Movement::Placement {
        player: crate::PlayerId::new(0),
        coords,
    });

    let bot_coords = (!game.check_game_over())
        .then(|| state.bots().find(&bot_name))
        .flatten()
        .and_then(|bot| bot.choose_move(&*game));
    if let Some(bot_coords) = bot_coords {
        let _ = game.add_move(crate::Movement::Placement {
            player: crate::PlayerId::new(1),
            coords: bot_coords,
        });
    }

    let winner_id = match game.status() {
        crate::core::game::GameStatus::Finished { winner } => Some(winner.id()),
        _ => None,
    };

    let mut final_score = 0;
    if let Some(wid) = winner_id {
        let mult = match diff_str.as_str() {
            "Medium" => 2.0,
            "Hard" => 3.0,
            _ => 1.0,
        };
        final_score = if wid == 0 {
            (100.0 * mult * (b_size as f32 / 6.0)) as i32
        } else {
            0
        };

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

    axum::Json(
        serde_json::json!({ "board": YEN::from(&*game), "winner": winner_id, "score": final_score }),
    )
}

pub async fn reiniciar_juego(
    axum::extract::State(state): axum::extract::State<AppState>,
    axum::extract::Json(payload): axum::extract::Json<ResetRequest>,
) -> impl IntoResponse {
    let session = state
        .get_or_create_session(payload.player.as_deref().unwrap_or("default"))
        .await;
    let mut game = session.game.lock().await;
    let size = payload.size.unwrap_or(5).clamp(3, 20);
    *game = crate::core::game::GameY::new(size);

    if let Some(diff_str) = payload.difficulty {
        if let Ok(diff) = BotDifficulty::from_str(&diff_str) {
            // Actualizamos la dificultad dentro de la sesión
            let mut current_diff = session.current_difficulty.lock().await;
            *current_diff = diff;

            if let Some(chosen_bot) = state.bots().get_random_bot_by_difficulty(diff) {
                let mut active_bot = session.active_bot.lock().await;
                *active_bot = chosen_bot.name().to_string();
            }
        }
    }
    axum::Json(YEN::from(&*game))
}

pub async fn obtener_historial(
    axum::extract::State(state): axum::extract::State<AppState>,
    axum::extract::Query(params): axum::extract::Query<HistoryQuery>,
) -> impl IntoResponse {
    let collection = state.db.collection::<serde_json::Value>("partidas");

    // 1. Configuración de la paginación
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(10).clamp(1, 100);
    let skip_value = (page - 1) * (limit as u64);

    // 2. Construir un  filtro dinámico
    let mut filter = doc! { "player": &params.username };

    // Añadimos el filtro de resultado si el frontend lo enví­a
    if let Some(res) = &params.result {
        filter.insert("result", res);
    }

    // 3. Contar el total de documentos usando el filtro final
    let total = match collection.count_documents(filter.clone()).await {
        Ok(count) => count,
        Err(e) => {
            eprintln!("Error al contar documentos en BBDD: {}", e);
            return empty_history_response(page, limit);
        }
    };

    let options = mongodb::options::FindOptions::builder()
        .sort(doc! { "date": -1 })
        .skip(skip_value)
        .limit(limit)
        .build();
    // 5. Ejecutar la búsqueda pasando las opciones correctamente
    let mut cursor = match collection.find(filter).with_options(options).await {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Error al buscar en la BBDD: {}", e);
            return empty_history_response(page, limit);
        }
    };

    // 6. Recoger los resultados del cursor
    let mut partidas = Vec::new();
    while let Some(Ok(mut doc)) = cursor.next().await {
        normalize_history_document(&mut doc);
        partidas.push(doc);
    }

    axum::Json(serde_json::json!({
        "data": partidas, "total": total, "page": page, "limit": limit,
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

    let wins = collection
        .count_documents(doc! {"player": &params.username, "result": "Victoria"})
        .await
        .unwrap_or(0);
    let losses = collection
        .count_documents(doc! {"player": &params.username, "result": "Derrota"})
        .await
        .unwrap_or(0);

    axum::Json(UserStats {
        wins: wins as i64,
        losses: losses as i64,
        total: (wins + losses) as i64,
        total_score,
    })
}

// --- PVP HANDLERS ---

pub async fn reiniciar_juego_pvp(
    axum::extract::State(state): axum::extract::State<AppState>,
    axum::extract::Json(payload): axum::extract::Json<PvpResetRequest>,
) -> impl IntoResponse {
    let size = payload.size.unwrap_or(6).clamp(3, 20);
    let session = state.upsert_pvp_session(&payload.match_id, size, payload.players.clone());
    axum::Json(
        serde_json::json!({ "board": YEN::from(&*session.game.lock().await), "next_turn": payload.players[0] }),
    )
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
    let _ = game.add_move(crate::Movement::Placement {
        player: crate::PlayerId::new(p_idx as u32),
        coords,
    });

    let winner_name = match game.status() {
        crate::core::game::GameStatus::Finished { winner } => {
            Some(players[winner.id() as usize].clone())
        }
        _ => None,
    };
    if let Some(winner) = &winner_name {
        let collection = state.db.collection::<serde_json::Value>("partidas");
        for player in &players {
            let opponent = players
                .iter()
                .find(|candidate| *candidate != player)
                .cloned()
                .unwrap_or_default();
            let result = if player == winner {
                "Victoria"
            } else {
                "Derrota"
            };
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
pub async fn status() -> impl IntoResponse {
    "OK"
}
pub async fn listar_dificultades() -> impl IntoResponse {
    axum::Json(
        BotDifficulty::all()
            .iter()
            .map(|d| d.to_string())
            .collect::<Vec<_>>(),
    )
}
pub async fn rendirse(
    axum::extract::State(state): axum::extract::State<AppState>,
    axum::extract::Json(payload): axum::extract::Json<SurrenderRequest>,
) -> impl IntoResponse {
    let record = serde_json::json!({ "player": payload.player, "date": Utc::now().to_rfc3339(), "result": "Derrota", "score": 0 });
    let _ = state
        .db
        .collection::<serde_json::Value>("partidas")
        .insert_one(record)
        .await;
    axum::Json(serde_json::json!({ "status": "ok" }))
}

fn validate_mongodb_uri(raw_uri: &str) -> Result<String, GameYError> {
    let uri = raw_uri.trim();
    if uri.is_empty() {
        return Err(GameYError::ServerError {
            message: "La variable MONGODB_URI esta vacia".to_string(),
        });
    }
    if !(uri.starts_with("mongodb://") || uri.starts_with("mongodb+srv://")) {
        return Err(GameYError::ServerError {
            message: "MONGODB_URI falta el esquema mongodb:// o mongodb+srv://".to_string(),
        });
    }
    Ok(uri.to_string())
}

pub async fn run_bot_server(port: u16) -> Result<(), GameYError> {
    let uri = validate_mongodb_uri(&std::env::var("MONGODB_URI").unwrap_or_default())?;
    let client = mongodb::Client::with_uri_str(uri)
        .await
        .map_err(|e| GameYError::ServerError {
            message: e.to_string(),
        })?;
    let db = client.database("gamey_db");
    let bots = YBotRegistry::new()
        .with_bot(Arc::new(AttackerBot))
        .with_bot(Arc::new(EdgeBot))
        .with_bot(Arc::new(RandomBot))
        .with_bot(Arc::new(BlockerBot))
        .with_bot(Arc::new(ProBot));
    let state = AppState::new(bots, db);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let router = create_router_with_metrics(state);

    match (
        std::env::var("GAMEY_TLS_CERT_PATH").ok(),
        std::env::var("GAMEY_TLS_KEY_PATH").ok(),
    ) {
        (Some(cert_path), Some(key_path)) => {
            let _ = rustls::crypto::ring::default_provider().install_default();
            let config =
                RustlsConfig::from_pem_file(PathBuf::from(cert_path), PathBuf::from(key_path))
                    .await
                    .map_err(|e| GameYError::ServerError {
                        message: format!("Failed to load TLS certificate: {}", e),
                    })?;

            axum_server::bind_rustls(addr, config)
                .serve(router.into_make_service())
                .await
                .map_err(|e| GameYError::ServerError {
                    message: e.to_string(),
                })
        }
        _ => {
            let listener =
                tokio::net::TcpListener::bind(addr)
                    .await
                    .map_err(|e| GameYError::ServerError {
                        message: format!("Failed to bind to port {}: {}", port, e),
                    })?;

            axum::serve(listener, router)
                .await
                .map_err(|e| GameYError::ServerError {
                    message: e.to_string(),
                })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{
        normalize_history_document, normalize_history_result, run_bot_server, validate_mongodb_uri,
    };

    #[test]
    fn normalize_history_result_maps_common_win_variants() {
        assert_eq!(normalize_history_result("Has ganado"), "Victoria");
        assert_eq!(normalize_history_result("Victory"), "Victoria");
        assert_eq!(normalize_history_result("ganhaste"), "Victoria");
    }

    #[test]
    fn normalize_history_result_maps_common_loss_variants() {
        assert_eq!(normalize_history_result("Has perdido"), "Derrota");
        assert_eq!(normalize_history_result("loss"), "Derrota");
        assert_eq!(normalize_history_result("Du hast verloren"), "Derrota");
    }

    #[test]
    fn normalize_history_document_updates_result_fields() {
        let mut record = serde_json::json!({
            "result": "Has ganado",
            "result_label": "Has perdido",
        });

        normalize_history_document(&mut record);

        assert_eq!(record["result"], "Victoria");
        assert_eq!(record["result_label"], "Derrota");
    }

    #[test]
    fn validate_mongodb_uri_rejects_empty_and_missing_scheme() {
        let empty_err = validate_mongodb_uri("   ").unwrap_err();
        assert!(empty_err.to_string().contains("esta vacia"));

        let scheme_err = validate_mongodb_uri("localhost:27017/gamey_db").unwrap_err();
        assert!(scheme_err.to_string().contains("falta el esquema"));
    }

    #[test]
    fn validate_mongodb_uri_accepts_valid_uri() {
        let uri = validate_mongodb_uri(" mongodb://localhost:27017/gamey_db ").unwrap();
        assert_eq!(uri, "mongodb://localhost:27017/gamey_db");
    }

    #[tokio::test]
    async fn run_bot_server_reports_bind_error_when_port_is_busy() {
        let listener = tokio::net::TcpListener::bind("0.0.0.0:0").await.unwrap();
        let port = listener.local_addr().unwrap().port();
        let _keep_alive = listener;

        let original_uri = std::env::var("MONGODB_URI").ok();
        unsafe {
            std::env::set_var("MONGODB_URI", "mongodb://localhost:27017/gamey_db");
        }

        let result = tokio::time::timeout(std::time::Duration::from_secs(5), run_bot_server(port))
            .await
            .expect("run_bot_server should not hang when bind fails");

        if let Some(value) = original_uri {
            unsafe {
                std::env::set_var("MONGODB_URI", value);
            }
        } else {
            unsafe {
                std::env::remove_var("MONGODB_URI");
            }
        }

        let err = result.unwrap_err();
        let err_msg = err.to_string();
        assert!(
            err_msg.contains("Failed to bind") || err_msg.contains("Address already in use"),
            "Se esperaba un error de puerto ocupado, pero se obtuvo: {}",
            err_msg
        );
    }
}
