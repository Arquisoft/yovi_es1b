use crate::{GameY, YEN, error::ErrorResponse, state::AppState};
use axum::{Json, extract::State};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Datos que el cliente envía al bot
#[derive(Deserialize, ToSchema)]
pub struct PlayRequest {
    /// Posición actual del tablero en notación YEN
    pub position: String,
    /// ID del bot a utilizar (ej: "random_bot").
    pub bot_id: Option<String>,
}

/// Respuesta que el bot devuelve al cliente
#[derive(Serialize, ToSchema, Deserialize)]
pub struct PlayResponse {
    /// Nueva posición del tablero o movimiento en notación YEN
    pub action: String,
    pub position: String,
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
    let selected_bot_id = payload.bot_id.unwrap_or_else(|| "random_bot".to_string());

    let bot = match state.bots().find(&selected_bot_id) {
        Some(bot) => bot,
        None => {
            let available_bots = state.bots().names().join(", ");
            return Err(Json(ErrorResponse::error(
                &format!(
                    "Bot no encontrado (not found): {}, disponibles: [{}]",
                    selected_bot_id, available_bots
                ),
                None,
                Some(selected_bot_id),
            )));
        }
    };

    let yen_string = payload.position.clone();

    let size = yen_string.split('/').count() as u32;

    let yen_parsed = YEN::new(size, 0, vec!['B', 'R'], yen_string);

    // 2. Ahora que tenemos el objeto YEN, lo convertimos en GameY
    let mut game_y = match GameY::try_from(yen_parsed) {
        Ok(game) => game,
        Err(err) => {
            return Err(Json(ErrorResponse::error(
                &format!("Error al inicializar el motor: {}", err),
                None,
                Some(selected_bot_id),
            )));
        }
    };

    let coords = match bot.choose_move(&game_y) {
        Some(coords) => coords,
        None => {
            return Err(Json(ErrorResponse::error(
                "No hay movimientos válidos disponibles",
                None,
                Some(selected_bot_id),
            )));
        }
    };

    let current_player = game_y.next_player().unwrap_or(crate::PlayerId::new(0));

    let bot_move = crate::Movement::Placement {
        player: current_player,
        coords,
    };

    if let Err(e) = game_y.add_move(bot_move) {
        return Err(Json(ErrorResponse::error(
            &format!("Error al aplicar el movimiento: {:?}", e),
            None,
            Some(selected_bot_id),
        )));
    }

    let action_str = format!("move({},{},{})", coords.x(), coords.y(), coords.z());
    let new_yen_obj: YEN = (&game_y).into();

    Ok(Json(PlayResponse {
        action: action_str,
        position: new_yen_obj.layout().to_string(),
    }))
}

#[utoipa::path(
    get,
    path = "/api/bots",
    responses(
        (status = 200, description = "Lista de bots disponibles", body = [String])
    ),
    tag = "Bot"
)]
pub async fn list_bots(State(state): State<AppState>) -> Json<Vec<String>> {
    // Usamos el método que ya tienes en tu estado
    Json(state.bots().names())
}
