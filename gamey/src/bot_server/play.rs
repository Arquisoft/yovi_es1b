use crate::{GameY, YEN, error::ErrorResponse, state::AppState};
use axum::{Json, extract::State};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Datos que el cliente envía al bot
#[derive(Deserialize, ToSchema)]
pub struct PlayRequest {
    /// Posición actual del tablero en notación YEN
    pub position: YEN,
    /// ID del bot a utilizar (ej: "random_bot").
    pub bot_id: Option<String>,
}

/// Respuesta que el bot devuelve al cliente
#[derive(Serialize, ToSchema, Deserialize)]
pub struct PlayResponse {
    /// Nueva posición del tablero o movimiento en notación YEN
    pub position: YEN,
}

#[utoipa::path(
    post,
    path = "/api/play",
    request_body = PlayRequest,
    responses(
        (status = 200, description = "Movimiento calculado exitosamente", body = PlayResponse),
        (status = 400, description = "Formato YEN inválido", body = ErrorResponse),
        (status = 404, description = "Estrategia de bot no encontrada", body = ErrorResponse)
    ),
    tag = "Bot"
)]
#[axum::debug_handler]
pub async fn play(
    State(state): State<AppState>,
    Json(payload): Json<PlayRequest>,
) -> Result<Json<PlayResponse>, Json<ErrorResponse>> {
    let yen = payload.position.clone();

    let mut game_y = match GameY::try_from(yen) {
        Ok(game) => game,
        Err(err) => {
            return Err(Json(ErrorResponse::error(
                &format!("Invalid YEN format: {}", err),
                None,
                payload.bot_id,
            )));
        }
    };

    let selected_bot_id = payload.bot_id.unwrap_or_else(|| "random_bot".to_string());

    let bot = match state.bots().find(&selected_bot_id) {
        Some(bot) => bot,
        None => {
            let available_bots = state.bots().names().join(", ");
            return Err(Json(ErrorResponse::error(
                &format!(
                    "Bot not found: {}, available bots: [{}]",
                    selected_bot_id, available_bots
                ),
                None,
                Some(selected_bot_id),
            )));
        }
    };

    let coords = match bot.choose_move(&game_y) {
        Some(coords) => coords,
        None => {
            return Err(Json(ErrorResponse::error(
                "No valid moves available for the bot",
                None,
                Some(selected_bot_id),
            )));
        }
    };

    let bot_move = crate::Movement::Placement {
        player: crate::PlayerId::new(1),
        coords,
    };

    if let Err(e) = game_y.add_move(bot_move) {
        return Err(Json(ErrorResponse::error(
            &format!("Error applying bot move: {:?}", e),
            None,
            Some(selected_bot_id),
        )));
    }

    let new_yen: YEN = (&game_y).into();

    Ok(Json(PlayResponse { position: new_yen }))
}
