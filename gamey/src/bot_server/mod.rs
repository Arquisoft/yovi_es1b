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

use axum::{Json, response::IntoResponse};
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
use crate::bot::ybot_registry::YBotRegistry;
use futures::stream::StreamExt;
use mongodb::bson::doc;
use tower_http::cors::{Any, CorsLayer};

// This helps Rust to understand the JSON that receive from Node
#[derive(Deserialize, utoipa::ToSchema)]
pub struct MoveRequest {
    pub index: u32,
    pub player: String,
}

// Para obtener el historial de partidas de un usuario específico.
#[derive(Deserialize)]
pub struct HistoryQuery {
    pub username: String,
}

// Estructura para recibir la rendición
#[derive(Deserialize)]
pub struct SurrenderRequest {
    player: String,
    difficulty: String,
    board_size: i32,
}

use utoipa::OpenApi;

#[derive(utoipa::OpenApi)]
#[openapi(
    paths(play::play, reiniciar_juego, realizar_movimiento, obtener_historial), // Añadida aquí
    components(schemas(
        play::PlayRequest,
        play::PlayResponse,
        YEN,
        ResetRequest,
        MoveRequest,
        GameRecord, // Añadida aquí
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
 * pub size: usize -->  Tamaño del tablero
 *
 */
#[derive(Deserialize, utoipa::ToSchema)]
pub struct ResetRequest {
    pub size: Option<u32>,
    pub difficulty: Option<String>, // NEW: Optional difficulty parameter
}

#[derive(serde::Serialize, serde::Deserialize, utoipa::ToSchema)]
pub struct GameRecord {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = Option<String>)] // <-- Esta línea soluciona el error de ObjectId
    pub id: Option<mongodb::bson::oid::ObjectId>,
    pub date: String,
    pub opponent: String,
    pub board_size: u32,
    pub difficulty: String,
    pub result: String,
}

// Routes
/// Creates the Axum router with the given state.
///
/// This is useful for testing the API without binding to a network port.
pub fn create_router(state: AppState) -> axum::Router {
    axum::Router::new()
        .route("/status", axum::routing::get(status))
        .route("/execute-move", axum::routing::post(realizar_movimiento)) // new
        .route("/history", axum::routing::get(obtener_historial))
        .route("/reset", axum::routing::post(reiniciar_juego)) // new
        .route("/difficulties", axum::routing::get(listar_dificultades)) // new
        .route("/surrender", axum::routing::post(rendirse))
        .route("/api/play", axum::routing::post(play::play))
        .merge(
            utoipa_swagger_ui::SwaggerUi::new("/swagger-ui")
                .url("/api-docs/openapi.json", ApiDoc::openapi()),
        )
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
    // Leer la URI de MongoDB desde el .env
    let uri = std::env::var("MONGODB_URI")
        .expect("La variable MONGODB_URI no está configurada en el entorno.");

    // Conectar a la BBDD
    let client = mongodb::Client::with_uri_str(uri)
        .await
        .map_err(|e| GameYError::ServerError {
            message: format!("Error conectando a Mongo: {}", e),
        })?;

    let db = client.database("gamey_db");

    // Crar el estado pasando la DB

    let bots = YBotRegistry::new()
        .with_bot(Arc::new(RandomBot))
        .with_bot(Arc::new(ProBot))
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
    // 1. Bloqueamos el Mutex
    let mut game = state.game.lock().unwrap();

    // 2. Movimiento Humano (Azul)
    // El índice se interpreta usando el tamaño REAL del juego activo en servidor.
    let b_size = game.board_size();
    let coords = crate::Coordinates::from_index(payload.index, b_size);

    let human_movement = crate::Movement::Placement {
        player: crate::PlayerId::new(0),
        coords,
    };

    // Intentamos añadir el movimiento
    // Si falla (ocupada/fuera de rango/turno inválido), el tablero no cambia.
    if let Err(e) = game.add_move(human_movement) {
        println!("Aviso: Movimiento humano no válido: {:?}", e);
    }

    // 3. Turno del Bot (Rojo) (si no ha ganado el humano ya)
    if !game.check_game_over() {
        // Obtener la dificultad actual
        //let current_diff = *state.current_difficulty.lock().unwrap();
        let active_bot_name = state.active_bot.lock().unwrap().clone();

        // Buscar un bot adecuado para esa dificultad
        if let Some(bot) = state.bots().find(&active_bot_name) {
            // Desreferenciamos el mutex guard con &*game
            if let Some(bot_coords) = bot.choose_move(&*game) {
                let bot_move = crate::Movement::Placement {
                    player: crate::PlayerId::new(1),
                    coords: bot_coords,
                };
                let _ = game.add_move(bot_move);
            }
        } else {
            // Fallback: RandomBot si no hay bot para esa dificultad (no debería pasar con el registro completo)
            if let Some(bot) = state.bots().find("random_bot") {
                if let Some(bot_coords) = bot.choose_move(&*game) {
                    let bot_move = crate::Movement::Placement {
                        player: crate::PlayerId::new(1),
                        coords: bot_coords,
                    };
                    let _ = game.add_move(bot_move);
                }
            }
        }
    }

    // 4. Extraer el ganador
    // Ganador leído desde el estado final tras aplicar jugadas válidas.
    let winner_id = match game.status() {
        &crate::core::game::GameStatus::Finished { winner } => Some(winner.id()),
        _ => None,
    };

    if winner_id.is_some() {
        println!("¡Tenemos un ganador!: {:?}", winner_id);

        let final_bot_name = state.active_bot.lock().unwrap().clone();
        let final_difficulty = state.current_difficulty.lock().unwrap().to_string();

        // Guardar la partida en MongoDB
        let db = state.db.clone();
        let b_size_clone = b_size;
        let res_text = if winner_id == Some(0) {
            "Victoria"
        } else {
            "Derrota"
        };

        // Guardar en un hilo para no ralentizar
        tokio::spawn(async move {
            let collection = db.collection::<serde_json::Value>("partidas");
            let record = serde_json::json!({
                "player": payload.player,
                "date": Utc::now().to_rfc3339(),
                "opponent": final_bot_name,
                "board_size": b_size_clone,
                "difficulty": final_difficulty,
                "result": res_text
            });

            let _ = collection.insert_one(record).await;
        });
    }

    // 5. Respuesta (Convertimos a YEN)
    // Respuesta para el front: tablero actualizado + ganador.
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
    let mut game = state.game.lock().unwrap();
    // Tamaño efectivo del reset:
    // - usa size enviado por cliente si existe
    // - si no existe, usa 5
    // - siempre acotado a [3..20]
    let size = payload.size.unwrap_or(5).clamp(3, 20);

    *game = crate::core::game::GameY::new(size);

    // Actualizar dificultad si se proporciona
    if let Some(diff_str) = payload.difficulty {
        if let Ok(diff) = BotDifficulty::from_str(&diff_str) {
            let mut current_diff = state.current_difficulty.lock().unwrap();
            *current_diff = diff;

            // Elegimos un bot al azar de esa dificultad y GUARDAMOS SU NOMBRE para toda la partida
            if let Some(chosen_bot) = state.bots().get_random_bot_by_difficulty(diff) {
                let mut active_bot = state.active_bot.lock().unwrap();
                *active_bot = chosen_bot.name().to_string();
                println!("Nueva partida iniciada. Bot asignado: {}", *active_bot);
            }

            println!("--> Dificultad actualizada a: {}", diff);
        }
    }

    println!("--> Juego reiniciado con tamaño {}.", size);

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
    // Acceder bbdd
    let collection = state.db.collection::<serde_json::Value>("partidas");

    // Consultar partidas del usuario
    let filter = doc! { "player": &params.username };

    // Definir opciones
    let mut cursor = match collection
        .find(filter)
        .sort(doc! { "date": -1 }) // Ordenamos de más reciente a más antiguo
        .await
    {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Error al buscar en la BBDD: {}", e);
            return axum::Json(serde_json::json!([]));
        }
    };

    // Recoger los resultados del cursor
    let mut partidas = Vec::new();
    while let Some(Ok(doc)) = cursor.next().await {
        partidas.push(doc);
    }

    axum::Json(serde_json::json!(partidas))
}

pub async fn rendirse(
    axum::extract::State(state): axum::extract::State<AppState>,
    axum::extract::Json(payload): axum::extract::Json<SurrenderRequest>,
) -> impl IntoResponse {
    // 1. Obtener contexto del juego actual (Bot que estaba jugando)
    let active_bot_name = state.active_bot.lock().unwrap().clone();
    let db = state.db.clone();

    // 2. Guardar la derrota en MongoDB (usamos tokio::spawn como en realizar_movimiento)
    tokio::spawn(async move {
        let collection = db.collection::<serde_json::Value>("partidas");
        let record = serde_json::json!({
            "player": payload.player,
            "date": Utc::now().to_rfc3339(),
            "opponent": active_bot_name,
            "board_size": payload.board_size,
            "difficulty": payload.difficulty,
            "result": "Derrota" // Al rendirse, el resultado es siempre derrota
        });

        if let Err(e) = collection.insert_one(record).await {
            eprintln!("Error al guardar la rendición en MongoDB: {:?}", e);
        }
    });

    // 3. Responder al Gateway
    axum::Json(serde_json::json!({
        "status": "ok",
        "message": "Rendición registrada correctamente"
    }))
}
