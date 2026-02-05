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
//! #[tokio::main]
//! async fn main() {
//!     if let Err(e) = run_bot_server(3000).await {
//!         eprintln!("Server error: {}", e);
//!     }
//! }
//! ```

pub mod choose;
pub mod error;
pub mod state;
pub mod version;
use axum::response::IntoResponse;
use std::sync::Arc;
pub use choose::MoveResponse;
pub use error::ErrorResponse;
pub use version::*;

use crate::{GameYError, RandomBot, YBotRegistry, state::AppState, yen};
use axum::Json;
use serde_json::{json, Value};

use crate::core::game::GameY; // Import GameY
use serde::Deserialize;


// This helps Rust to understand the JSON that receive from Node
#[derive(Deserialize)]
pub struct MoveRequest {
    pub index: u32
}


// Routes
/// Creates the Axum router with the given state.
///
/// This is useful for testing the API without binding to a network port.
pub fn create_router(state: AppState) -> axum::Router {
    axum::Router::new()
        .route("/status", axum::routing::get(status))
        .route("/execute-move", axum::routing::post(realizar_movimiento)) // new
        .route("/reset", axum::routing::post(reiniciar_juego)) // new
        .route(
            "/{api_version}/ybot/choose/{bot_id}",
            axum::routing::post(choose::choose),
        )
        .with_state(state)
}

/// Creates the default application state with the standard bot registry.
///
/// The default state includes the `RandomBot` which selects moves randomly.
pub fn create_default_state() -> AppState {
    let bots = YBotRegistry::new().with_bot(Arc::new(RandomBot));
    AppState::new(bots)
}

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
    let state = create_default_state();
    let app = create_router(state);

    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr)
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
pub async fn realizar_movimiento (
    axum::extract::State(state): axum::extract::State<AppState>,
    axum::extract::Json(payload): axum::extract::Json<MoveRequest>
) -> impl IntoResponse {

    // 1. Bloqueamos el Mutex
    let mut game = state.game.lock().unwrap();

    // 2. Movimiento Humano (Azul)
    let b_size = game.board_size();
    let coords = crate::Coordinates::from_index(payload.index, b_size);
    
    let human_movement = crate::Movement::Placement { 
        player: crate::PlayerId::new(0),
        coords,
    };

    // Intentamos añadir el movimiento
    if let Err(e) = game.add_move(human_movement) {
        println!("Aviso: Movimiento humano no válido: {:?}", e);
    }

    // 3. Turno del Bot (Rojo) (si no ha ganado el humano ya)
    if !game.check_game_over() {
        if let Some(bot) = state.bots().find("random_bot") {
        // Desreferenciamos el mutex guard con &*game
        if let Some(bot_coords) = bot.choose_move(&*game) {
            let bot_move = crate::Movement::Placement {
                player: crate::PlayerId::new(1),
                coords: bot_coords,
            };
            let _ = game.add_move(bot_move);
        }
    }
    }
    

    // 4. Extraer el ganador
    let winner_id = match game.status() {
        &crate::core::game::GameStatus::Finished { winner } => Some(winner.id()),
        _ => None,
    };

    if winner_id.is_some() {
        println!("¡Tenemos un ganador!: {:?}", winner_id);
    }

    // 5. Respuesta (Convertimos a YEN)
    let yen_data: crate::YEN = (&*game).into();
    
    axum::Json(serde_json::json!({
        "board": yen_data,
        "winner": winner_id
    }))
}


// New
// This endpoint resets the game to its initial state.
pub async fn reiniciar_juego(
    axum::extract::State(state): axum::extract::State<AppState>
) -> impl IntoResponse {

    let mut game = state.game.lock().unwrap();

    // Reiniciamos el juego creando una nueva instancia de GameY
    *game = crate::core::game::GameY::new(5);

    println!("--> Juego reiniciado.");

    let yen_data: crate::YEN = (&*game).into();
    axum::Json(yen_data)
}
