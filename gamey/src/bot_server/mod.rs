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
//!     if let Err(e) = run_bot_server(3000).await {
//!         eprintln!("Server error: {}", e);
//!     }
//! }
//! ```

pub mod error;
pub mod play;
pub mod state;
pub mod version;

use axum::{ response::IntoResponse};
use chrono::Utc;
pub use error::ErrorResponse;
pub use play::{PlayRequest, PlayResponse, play};
use std::sync::Arc;
pub use version::*;

use crate::{BotDifficulty, GameYError, YEN, state::AppState};

use serde::Deserialize;
use std::str::FromStr;

use crate::bot::attacker_bot::AttackerBot;
use crate::bot::edge_bot::EdgeBot;
use crate::bot::pro_bot::ProBot;
use crate::bot::random::RandomBot;
use crate::bot::blocker_bot::BlockerBot;
use crate::bot::ybot_registry::YBotRegistry;
use futures::stream::StreamExt;
use mongodb::bson::doc;


// This helps Rust to understand the JSON that receive from Node
#[derive(Deserialize, utoipa::ToSchema)]
pub struct MoveRequest {
    pub index: u32,
    pub player: String,
}

// Para obtener el historial de partidas de un usuario especí­fico.
//añadida la paginación con page y limit opcionales.
#[derive(Deserialize)]
pub struct HistoryQuery {
    pub username: String,
    pub page: Option<u64>,
    pub limit: Option<i64>,
    pub result: Option<String>,
}

/**
 * Estructura para recibir la consulta de estadí­sticas de un usuario especí­fico.
 */
#[derive(Deserialize)]
pub struct StatsQuery {
    pub username: String,
}

// Estructura de respuesta para el historial paginado
#[derive(serde::Serialize)]
pub struct PaginatedHistoryResponse {
    pub data: Vec<serde_json::Value>,
    pub total: u64,
    pub page: u64,
    pub limit: i64,
    pub total_pages: u64,
}

// Estructura para recibir la Rendición
#[derive(Deserialize)]
pub struct SurrenderRequest {
    player: String,
    difficulty: String,
    board_size: i32,
}

#[derive(serde::Serialize)]
pub struct UserStats {
    pub wins: i64,
    pub losses: i64,
    pub total: i64,
}

use utoipa::OpenApi;

#[derive(utoipa::OpenApi)]
#[openapi(
    paths(play::play, reiniciar_juego, realizar_movimiento, obtener_historial), 
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

/*
 * Para pasar el tamaño del tablero desde Node hasta Rust.
 *
 * #[derive(Deserialize)] --> Convierte el JSON recibido a esta estructura de Rust
 *
 * pub size: usize -->  tamaño del tablero
 *
 */
#[derive(Deserialize, utoipa::ToSchema)]
pub struct ResetRequest {
    pub size: Option<u32>,
    pub difficulty: Option<String>,
    pub player: Option<String>, // <--- AñADE ESTA LíNEA
}

#[derive(serde::Serialize, serde::Deserialize, utoipa::ToSchema)]
pub struct GameRecord {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = Option<String>)] // <-- Esta lí­nea soluciona el error de ObjectId
    pub id: Option<mongodb::bson::oid::ObjectId>,
    pub date: String,
    pub opponent: String,
    pub board_size: u32,
    pub difficulty: String,
    pub result: String,
}

fn normalize_history_result(raw: &str) -> &'static str {
    let stripped: String = raw
        .trim()
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric())
        .map(|ch| ch.to_ascii_lowercase())
        .collect();

    match stripped.as_str() {
        "victoria" | "victory" | "win" | "won" | "ganado" | "youwin" | "duhastgewonnen" | "ganhaste" => "Victoria",
        "derrota" | "defeat" | "loss" | "lost" | "perdido" | "youlose" | "duhastverloren" | "perdeste" => "Derrota",
        "hasganado" => "Victoria",
        "hasperdido" => "Derrota",
        _ => "Derrota",
    }
}

fn normalize_history_document(record: &mut serde_json::Value) {
    if let Some(obj) = record.as_object_mut() {
        if let Some(result) = obj.get("result").and_then(|value| value.as_str()) {
            obj.insert(
                "result".to_string(),
                serde_json::Value::String(normalize_history_result(result).to_string()),
            );
        }

        if let Some(result_label) = obj.get("result_label").and_then(|value| value.as_str()) {
            obj.insert(
                "result_label".to_string(),
                serde_json::Value::String(normalize_history_result(result_label).to_string()),
            );
        }
    }
}

// Routes
/// Creates the Axum router with the given state.
///
/// This is useful for testing the API without binding to a network port.
pub fn create_router(state: AppState) -> axum::Router {
    axum::Router::new()

        // 1. Ponemos Swagger al principio para que nada lo intercepte
        .merge(
            utoipa_swagger_ui::SwaggerUi::new("/swagger-ui")
                .url("/api-docs/openapi.json", ApiDoc::openapi()),
        )
        // 2. El resto de tus rutas
        .route("/status", axum::routing::get(status))
        .route("/execute-move", axum::routing::post(realizar_movimiento))
        .route("/history", axum::routing::get(obtener_historial))
        .route("/reset", axum::routing::post(reiniciar_juego))
        .route("/difficulties", axum::routing::get(listar_dificultades))
        .route("/surrender", axum::routing::post(rendirse))
        .route("/stats", axum::routing::get(obtener_estadisticas))
        .route("/api/play", axum::routing::post(play::play))
        .with_state(state)
}

/*
/// Creates the default application state with the standard bot registry.
///
/// The default state includes the `RandomBot` which selects moves randomly.
pub fn create_default_state() -> AppState {
    let bots = create_default_registry();
    AppState::new(bots)
}
*/

/// Starts the bot server on the specified port.
///
/// This function blocks until the server is shut down.
///
/// # Arguments
/// * `port` - The TCP port to listen on
///
/// # Errors
/// Returns `GameYError::ServerError` if:
/// - The TCP port cannot be bound (e.g., port already in use, permission denied)
/// - The server encounters an error while running
pub async fn run_bot_server(port: u16) -> Result<(), GameYError> {
    // Leer y validar la URI de MongoDB desde variables de entorno.
    let uri = validate_mongodb_uri(
        &std::env::var("MONGODB_URI").map_err(|_| GameYError::ServerError {
            message: "La variable MONGODB_URI no esta configurada. Usa una URI completa, por ejemplo: mongodb://localhost:27017/gamey_db".to_string(),
        })?,
    )?;

    // Conectar a la BBDD
    let client = mongodb::Client::with_uri_str(&uri)
        .await
        .map_err(|e| GameYError::ServerError {
            message: format!("Error conectando a Mongo: {}", e),
        })?;

    let db = client.database("gamey_db");

    // Crar el estado pasando la DB

    let bots = YBotRegistry::new()
        .with_bot(Arc::new(RandomBot))
        .with_bot(Arc::new(ProBot))
        .with_bot(Arc::new(BlockerBot))
        .with_bot(Arc::new(AttackerBot))
        .with_bot(Arc::new(EdgeBot));

    let state = AppState::new(bots, db);
    let app = create_router(state);

    let addr = format!("0.0.0.0:{}", port);
    let listener =
        tokio::net::TcpListener::bind(&addr)
            .await
            .map_err(|e| GameYError::ServerError {
                message: format!("Failed to bind to {}: {}", addr, e),
            })?;

    println!("Server mode: Listening on http://{}", addr);
    axum::serve(listener, app)
        .await
        .map_err(|e| GameYError::ServerError {
            message: format!("Server error: {}", e),
        })?;

    Ok(())
}

fn validate_mongodb_uri(raw_uri: &str) -> Result<String, GameYError> {
    let uri = raw_uri.trim().to_string();

    if uri.is_empty() {
        return Err(GameYError::ServerError {
            message: "La variable MONGODB_URI esta vacia. Debe incluir esquema (mongodb:// o mongodb+srv://).".to_string(),
        });
    }

    if !uri.starts_with("mongodb://") && !uri.starts_with("mongodb+srv://") {
        return Err(GameYError::ServerError {
            message: format!(
                "MONGODB_URI invalida: falta el esquema. Valor recibido: '{}'. Formato esperado: mongodb://... o mongodb+srv://...",
                uri
            ),
        });
    }

    Ok(uri)
}

/// Health check endpoint handler.
///
/// Returns "OK" to indicate the server is running.
pub async fn status() -> impl IntoResponse {
    "OK"
}

// New
// This endpoint handles the move made by the human player and then triggers the bot's response.

#[utoipa::path(
    post,
    path = "/execute-move",
    request_body = MoveRequest,
    responses(
        (status = 200, description = "Movimiento procesado", body = Value) // Value porque devuelves un json! manual
    ),
    tag = "Bot"
)]
pub async fn realizar_movimiento(
    axum::extract::State(state): axum::extract::State<AppState>,
    axum::extract::Json(payload): axum::extract::Json<MoveRequest>,
) -> impl IntoResponse {
    // 1. Obtener la sesión del usuario (Corregido de ax_state a state)
    let session = state.get_or_create_session(&payload.player).await;

    // Bloqueamos la sesión privada (Añadidos tipos explí­citos para ayudar al compilador)
    let mut game = session.game.lock().await;
    let current_difficulty_guard = session.current_difficulty.lock().await;
    let active_bot_name = session.active_bot.lock().await.clone();

    // 2. Movimiento Humano
    let b_size = game.board_size();
    let coords = crate::Coordinates::from_index(payload.index, b_size);

    let human_movement = crate::Movement::Placement {
        player: crate::PlayerId::new(0),
        coords,
    };

    if let Err(e) = game.add_move(human_movement) {
        println!("Aviso: Movimiento humano no válido: {:?}", e);
    }

    // 3. Turno del Bot
    if !game.check_game_over() {
        // Buscamos un bot usando el nombre guardado en la sesión
        if let Some(bot) = state.bots().find(&active_bot_name) {
            if let Some(bot_coords) = bot.choose_move(&*game) {
                let bot_move = crate::Movement::Placement {
                    player: crate::PlayerId::new(1),
                    coords: bot_coords,
                };
                let _ = game.add_move(bot_move);
            }
        }
    }

    // 4. Extraer el ganador y guardar en DB
    let winner_id = match game.status() {
        &crate::core::game::GameStatus::Finished { winner } => Some(winner.id()),
        _ => None,
    };

    if winner_id.is_some() {
        let db = state.db.clone();
        let final_bot_name = active_bot_name.clone();
        let final_difficulty = current_difficulty_guard.to_string();
        let player_name = payload.player.clone();

        tokio::spawn(async move {
            let collection = db.collection::<serde_json::Value>("partidas");
            let record = serde_json::json!({
                "player": player_name,
                "date": Utc::now().to_rfc3339(),
                "opponent": final_bot_name,
                "board_size": b_size,
                "difficulty": final_difficulty,
                "result": normalize_history_result(if winner_id == Some(0) { "Victoria" } else { "Derrota" })
            });
            let _ = collection.insert_one(record).await;
        });
    }

    let yen_data: crate::YEN = (&*game).into();
    axum::Json(serde_json::json!({
        "board": yen_data,
        "winner": winner_id
    }))
}

/*
 * Para reiniciar el juego a su estado inicial, creando una nueva instancia de GameY con el tamaño especificado.
 *
 *
 */

#[utoipa::path(
    post,
    path = "/reset",
    request_body = ResetRequest,
    responses(
        (status = 200, description = "Tablero reiniciado", body = YEN)
    ),
    tag = "Bot"
)]
pub async fn reiniciar_juego(
    axum::extract::State(state): axum::extract::State<AppState>,
    axum::extract::Json(payload): axum::extract::Json<ResetRequest>,
) -> impl IntoResponse {

    let username = payload.player.as_deref().unwrap_or("default_user");
    let session = state.get_or_create_session(username).await;

    let mut game = session.game.lock().await;
    let size = payload.size.unwrap_or(5).clamp(3, 20);
    *game = crate::core::game::GameY::new(size);

    if let Some(diff_str) = payload.difficulty {
        if let Ok(diff) = BotDifficulty::from_str(&diff_str) {
            // Actualizamos la dificultad DENTRO de la sesión
            let mut current_diff = session.current_difficulty.lock().await;
            *current_diff = diff;

            if let Some(chosen_bot) = state.bots().get_random_bot_by_difficulty(diff) {
                let mut active_bot = session.active_bot.lock().await;
                *active_bot = chosen_bot.name().to_string();
            }
        }
    }

    let yen_data: crate::YEN = (&*game).into();
    axum::Json(yen_data)
}

/// Endpoint para listar las dificultades disponibles.
pub async fn listar_dificultades() -> impl IntoResponse {
    let difficulties = BotDifficulty::all();
    let diff_strings: Vec<String> = difficulties.iter().map(|d| d.to_string()).collect();
    axum::Json(diff_strings)
}

#[utoipa::path(
    get,
    path = "/history",
    responses(
        (status = 200, description = "Listado de partidas guardadas", body = [GameRecord])
    ),
    tag = "Bot"
)]
pub async fn obtener_historial(
    axum::extract::State(state): axum::extract::State<AppState>,
    axum::extract::Query(params): axum::extract::Query<HistoryQuery>,
) -> impl IntoResponse {
    let collection = state.db.collection::<serde_json::Value>("partidas");

    // 1. Configuración de la paginación (arreglado el tipado)
    let page = params.page.unwrap_or(1).max(1); 
    let limit = params.limit.unwrap_or(10).clamp(1, 100); 
    let skip_value = (page - 1) * (limit as u64);

    // 2. Construir un úNICO filtro dinámico
    // CRíTICO: Asegúrate de si tu campo en Mongo se llama "player" o "username". Aquí­ asumo "player".
    let mut filter = doc! { "player": &params.username };

    // Añadimos el filtro de resultado si el frontend lo enví­a
    if let Some(res) = &params.result {
        filter.insert("result", res);
    }

    // 3. Contar el total de documentos UNA SOLA VEZ, usando el filtro final
        let total_documents = match collection.count_documents(filter.clone()).await {        Ok(count) => count,
        Err(e) => {
            eprintln!("Error al contar documentos en BBDD: {}", e);
            return axum::Json(serde_json::json!({
                "error": "Error interno del servidor"
            }));
        }
    };

    let total_pages = (total_documents as f64 / limit as f64).ceil() as u64;

    // 4. Opciones de consulta con paginación
    let find_options = mongodb::options::FindOptions::builder()
        .sort(doc! { "date": -1 }) // Asegúrate de que el campo fecha se llama "date"
        .skip(skip_value)
        .limit(limit)
        .build();

    // 5. Ejecutar la búsqueda pasando las opciones correctamente   
        let mut cursor = match collection.find(filter).with_options(find_options).await {        
        Ok(c) => c,
        Err(e) => {
            eprintln!("Error al buscar en la BBDD: {}", e);
            return axum::Json(serde_json::json!({
                "error": "Error interno del servidor"
            }));
        }
    };

    // 6. Recoger los resultados del cursor
    // Recuerda que esto necesita importar: use futures::stream::StreamExt;
    let mut partidas = Vec::new();
    while let Some(Ok(mut doc)) = cursor.next().await {
        normalize_history_document(&mut doc);
        partidas.push(doc);
    }

    // 7. Devolver la respuesta como JSON
    axum::Json(serde_json::json!({
        "data": partidas,
        "total": total_documents,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
    }))
}

pub async fn rendirse(
    axum::extract::State(state): axum::extract::State<AppState>,
    axum::extract::Json(payload): axum::extract::Json<SurrenderRequest>,
) -> impl IntoResponse {
    // Buscamos la sesión para saber contra qué bot estaba perdiendo
    let session = state.get_or_create_session(&payload.player).await;
    let active_bot_name = session.active_bot.lock().await.clone();
    let db = state.db.clone();

    tokio::spawn(async move {
        let collection = db.collection::<serde_json::Value>("partidas");
        let record = serde_json::json!({
            "player": payload.player,
            "date": Utc::now().to_rfc3339(),
            "opponent": active_bot_name,
            "board_size": payload.board_size,
            "difficulty": payload.difficulty,
            "result": "Derrota"
        });
        let _ = collection.insert_one(record).await;
    });

    axum::Json(serde_json::json!({ "status": "ok", "message": "Rendición registrada" }))

}


pub async fn obtener_estadisticas(
    axum::extract::State(state): axum::extract::State<AppState>,
    axum::extract::Query(params): axum::extract::Query<StatsQuery>,
) -> impl axum::response::IntoResponse {
    let collection = state.db.collection::<serde_json::Value>("partidas");

    // Contar victorias
    let wins_filter = doc! { "player": &params.username, "result": "Victoria" };
    let wins = collection.count_documents(wins_filter).await.unwrap_or(0);

    // Contar derrotas
    let losses_filter = doc! { "player": &params.username, "result": "Derrota" };
    let losses = collection.count_documents(losses_filter).await.unwrap_or(0);

    println!("Victorias: {}, Derrotas: {}", wins, losses);
    println!("-------------------");

    // Devolver la estructura
    axum::Json(UserStats {
        wins: wins as i64,
        losses: losses as i64,
        total: (wins + losses) as i64,
    })
}

#[cfg(test)]
mod tests {
    use super::{normalize_history_document, normalize_history_result, validate_mongodb_uri, run_bot_server};

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
        assert!(err.to_string().contains("Failed to bind"));
    }
}

