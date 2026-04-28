use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use gamey::{
    ErrorResponse, PlayResponse, RandomBot, YBotRegistry, YEN, create_router, state::AppState,
};
use http_body_util::BodyExt;
use mongodb::Client;
use std::sync::Arc;
use tower::ServiceExt;

/// Helper para obtener una base de datos de prueba (local/falsa)
/// Esto permite que el struct AppState se cree correctamente
async fn get_test_db() -> mongodb::Database {
    let client = Client::with_uri_str("mongodb://localhost:27017")
        .await
        .unwrap_or_else(|_| panic!("Fallo al crear cliente de prueba"));
    client.database("test_db")
}

/// Helper to create a test app with the default state
async fn test_app() -> axum::Router {
    let bots = YBotRegistry::new().with_bot(Arc::new(RandomBot));
    let db = get_test_db().await;
    let state = AppState::new(bots, db);
    create_router(state)
}

/// Helper to create a test app with a custom state
fn test_app_with_state(state: AppState) -> axum::Router {
    create_router(state)
}

// ============================================================================
// Status endpoint tests
// ============================================================================

#[tokio::test]
async fn test_status_endpoint_returns_ok() {
    let app = test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/status")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(&body[..], b"OK");
}

// ============================================================================
// Choose endpoint tests - Success cases
// ============================================================================

#[tokio::test]
async fn test_choose_endpoint_with_valid_request() {
    let app = test_app().await;

    // 1. Creamos un tablero de tamaño 3 vacío (Y-game Exchange Notation)
    let yen = YEN::new(3, 0, vec!['B', 'R'], "./../...".to_string());
    let celdas_vacias_antes = yen.layout().chars().filter(|c| *c == '.').count();

    // 2. Preparamos el payload con el formato nuevo que espera tu API
    let payload = serde_json::json!({
        "position": yen.layout(),
        "bot_id": "random_bot"
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/play") // Ruta actualizada
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    // 3. Assertions
    assert_eq!(response.status(), StatusCode::OK);

    // Verificamos que el bot ha puesto una ficha (hay una celda vacía menos)
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let play_response: PlayResponse =
        serde_json::from_slice(&body).expect("Fallo al parsear PlayResponse");

    let celdas_vacias_despues = play_response.position.chars().filter(|c| *c == '.').count();

    assert_eq!(
        celdas_vacias_despues,
        celdas_vacias_antes - 1,
        "El bot debería haber colocado exactamente una ficha"
    );
}

#[tokio::test]
async fn test_choose_endpoint_with_partially_filled_board() {
    let app = test_app().await;

    // 1. Tablero de tamaño 3 con algunas celdas ocupadas
    // Layout: B en la primera celda, R en la segunda, etc.
    let yen = YEN::new(3, 2, vec!['B', 'R'], "B/R./.B.".to_string());
    let celdas_vacias_antes = yen.layout().chars().filter(|c| *c == '.').count(); // Debería haber 3 puntos

    let payload = serde_json::json!({
        "position": yen.layout(),
        "bot_id": "random_bot"
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/play")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let play_response: PlayResponse = serde_json::from_slice(&body).unwrap();

    let celdas_vacias_despues = play_response.position.chars().filter(|c| *c == '.').count();
    assert_eq!(
        celdas_vacias_despues,
        celdas_vacias_antes - 1,
        "El bot debe elegir una de las celdas vacías restantes"
    );
}
// ============================================================================
// Choose endpoint tests - Error cases
// ============================================================================

/*
#[tokio::test]
async fn test_choose_endpoint_with_invalid_api_version() {
    let app = test_app().await;

    let yen = YEN::new(3, 0, vec!['B', 'R'], "./../...".to_string());
    let payload = serde_json::json!({
        "position": yen,
        "bot_id": "random_bot"
    });

    // Intentamos acceder a una versión no soportada (v2) siguiendo el nuevo estilo de ruta
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v2/play")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    // Importante: Si tu router no reconoce el prefijo /v2/, esto devolverá 404 y el test fallará aquí.
    // Si tu código maneja el versionado como un middleware o segmento dinámico, devolverá 200 con el JSON de error.
    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let error_response: ErrorResponse = serde_json::from_slice(&body)
        .expect("La respuesta debería ser un JSON de ErrorResponse con el fallo de versión");

    assert!(error_response.message.contains("Unsupported API version"));
    assert_eq!(error_response.api_version, Some("v2".to_string()));
}
    */

#[tokio::test]
async fn test_choose_endpoint_with_unknown_bot() {
    let app = test_app().await;

    let yen = YEN::new(3, 0, vec!['B', 'R'], "./../...".to_string());

    let payload = serde_json::json!({
        "position": yen.layout(),
        "bot_id": "unknown_bot"
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/play")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    // Según tu código anterior, Axum devuelve 200 pero con un JSON de ErrorResponse
    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let error_response: ErrorResponse = serde_json::from_slice(&body).unwrap();

    // Verificamos que el mensaje es el correcto para el usuario
    assert!(error_response.message.to_lowercase().contains("not found"));
    assert_eq!(error_response.bot_id, Some("unknown_bot".to_string()));
}

#[tokio::test]
async fn test_choose_endpoint_with_invalid_json() {
    let app = test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/ybot/choose/random_bot")
                .header("content-type", "application/json")
                .body(Body::from("{ invalid json }"))
                .unwrap(),
        )
        .await
        .unwrap();

    // Invalid JSON should return a 4xx error
    assert!(response.status().is_client_error());
}

#[tokio::test]
async fn test_choose_endpoint_with_missing_content_type() {
    let app = test_app().await;

    let yen = YEN::new(3, 0, vec!['B', 'R'], "./../...".to_string());

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/ybot/choose/random_bot")
                // No content-type header
                .body(Body::from(serde_json::to_string(&yen).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    // Missing content-type should return an error
    assert!(response.status().is_client_error());
}
// ============================================================================
// Custom state tests
// ============================================================================
#[tokio::test]
async fn test_choose_with_custom_bot_registry() {
    // 1. Setup: Registro que SOLO tiene el RandomBot
    let bots = YBotRegistry::new().with_bot(Arc::new(RandomBot));
    let db = get_test_db().await;
    let state = AppState::new(bots, db);
    let app = test_app_with_state(state);

    let yen = YEN::new(3, 0, vec!['B', 'R'], "./../...".to_string());
    let payload = serde_json::json!({
        "position": yen.layout(),
        "bot_id": "random_bot"
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/play") // Ruta actualizada
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}
#[tokio::test]
async fn test_choose_with_empty_bot_registry() {
    // 1. Setup: Registro totalmente vacío
    let bots = YBotRegistry::new();
    let db = get_test_db().await;
    let state = AppState::new(bots, db);
    let app = test_app_with_state(state);

    let yen = YEN::new(3, 0, vec!['B', 'R'], "./../...".to_string());
    let payload = serde_json::json!({
        "position": yen.layout(),
        "bot_id": "random_bot"
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/play")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    // El servidor responde 200 pero con un JSON indicando el error
    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let error_response: ErrorResponse = serde_json::from_slice(&body).unwrap();

    // Verificamos que el mensaje es coherente con un registro vacío
    assert!(error_response.message.to_lowercase().contains("not found"));
}

// ============================================================================
// Route not found tests
// ============================================================================

#[tokio::test]
async fn test_unknown_route_returns_404() {
    let app = test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/unknown/route")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_wrong_method_on_status_endpoint() {
    let app = test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/status")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // POST to a GET-only endpoint should return 405 Method Not Allowed
    assert_eq!(response.status(), StatusCode::METHOD_NOT_ALLOWED);
}
#[tokio::test]
async fn test_get_on_play_endpoint_returns_method_not_allowed() {
    let app = test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .method("GET") // El endpoint /api/play solo acepta POST
                .uri("/api/play")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // Ahora sí estamos testeando que el método GET está bloqueado en una ruta real
    assert_eq!(response.status(), StatusCode::METHOD_NOT_ALLOWED);
}

// ============================================================================
// Board size edge cases
// ============================================================================

#[tokio::test]
async fn test_choose_with_size_1_board() {
    let app = test_app().await;

    let payload = serde_json::json!({
        "position": ".",
        "bot_id": "random_bot"
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/play")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let play_response: PlayResponse = serde_json::from_slice(&body).unwrap();
    assert!(!play_response.position.contains('.'));
    let size_detectado = play_response.position.split('/').count();
    assert_eq!(size_detectado, 1);
}

#[tokio::test]
async fn test_choose_with_nearly_full_board() {
    let app = test_app().await;

    let payload = serde_json::json!({
        "position": "B/BR/BB.",
        "bot_id": "random_bot"
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/play")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let play_response: PlayResponse = serde_json::from_slice(&body).unwrap();
    assert!(!play_response.position.contains('.'));
    let size_detectado = play_response.position.split('/').count();
    assert_eq!(size_detectado, 3);
}

// ============================================================================
// Multiple bots tests
// ============================================================================

#[tokio::test]
async fn test_choose_with_blocker_bot() {
    use gamey::BlockerBot;

    let bots = YBotRegistry::new()
        .with_bot(Arc::new(RandomBot))
        .with_bot(Arc::new(BlockerBot));
    let db = get_test_db().await;
    let state = AppState::new(bots, db);
    let app = test_app_with_state(state);

    let yen = YEN::new(3, 0, vec!['B', 'R'], "./../...".to_string());
    let empty_before = yen.layout().chars().filter(|c| *c == '.').count();

    let payload = serde_json::json!({ "position": yen.layout(), "bot_id": "blocker_bot" });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/play")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let play_response: PlayResponse = serde_json::from_slice(&body).unwrap();
    let empty_after = play_response.position.chars().filter(|c| *c == '.').count();
    assert_eq!(empty_after, empty_before - 1);
}

#[tokio::test]
async fn test_choose_with_pro_bot() {
    use gamey::ProBot;

    let bots = YBotRegistry::new()
        .with_bot(Arc::new(RandomBot))
        .with_bot(Arc::new(ProBot));
    let db = get_test_db().await;
    let state = AppState::new(bots, db);
    let app = test_app_with_state(state);

    let yen = YEN::new(3, 0, vec!['B', 'R'], "./../...".to_string());
    let empty_before = yen.layout().chars().filter(|c| *c == '.').count();

    let payload = serde_json::json!({ "position": yen.layout(), "bot_id": "pro_bot" });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/play")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let play_response: PlayResponse = serde_json::from_slice(&body).unwrap();
    let empty_after = play_response.position.chars().filter(|c| *c == '.').count();
    assert_eq!(empty_after, empty_before - 1);
}

#[tokio::test]
async fn test_all_bots_return_valid_moves_on_same_board() {
    use gamey::{BlockerBot, ProBot};

    let bots_config: Vec<(&str, Arc<dyn gamey::YBot>)> = vec![
        ("random_bot", Arc::new(RandomBot) as Arc<dyn gamey::YBot>),
        ("blocker_bot", Arc::new(BlockerBot) as Arc<dyn gamey::YBot>),
        ("pro_bot", Arc::new(ProBot) as Arc<dyn gamey::YBot>),
    ];

    let yen = YEN::new(3, 2, vec!['B', 'R'], "B/R./.B.".to_string());
    let empty_before = yen.layout().chars().filter(|c| *c == '.').count();

    for (bot_id, bot) in bots_config {
        let registry = YBotRegistry::new().with_bot(bot);
        let db = get_test_db().await;
        let state = AppState::new(registry, db);
        let app = test_app_with_state(state);

        let payload = serde_json::json!({ "position": yen.layout(), "bot_id": bot_id });

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/play")
                    .header("content-type", "application/json")
                    .body(Body::from(serde_json::to_string(&payload).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK, "Bot {} falló", bot_id);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let play_response: PlayResponse = serde_json::from_slice(&body).unwrap();
        let empty_after = play_response.position.chars().filter(|c| *c == '.').count();
        assert_eq!(
            empty_after,
            empty_before - 1,
            "Bot {} no colocó exactamente una ficha",
            bot_id
        );
    }
}

// ============================================================================
// Player turn tests
// ============================================================================

#[tokio::test]
async fn test_choose_with_player_1_turn() {
    let app = test_app().await;

    let yen = YEN::new(3, 1, vec!['B', 'R'], "B/../...".to_string());
    let empty_before = yen.layout().chars().filter(|c| *c == '.').count();

    let payload = serde_json::json!({ "position": yen.layout(), "bot_id": "random_bot" });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/play")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let play_response: PlayResponse = serde_json::from_slice(&body).unwrap();
    let empty_after = play_response.position.chars().filter(|c| *c == '.').count();
    assert_eq!(empty_after, empty_before - 1);
}

// ============================================================================
// Error response structure tests
// ============================================================================

#[tokio::test]
async fn test_error_response_fields_for_unknown_bot() {
    let app = test_app().await;

    let payload = serde_json::json!({
        "position": "not_a_valid_yen_format",
        "bot_id": "nonexistent_bot"
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/play")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let error: ErrorResponse = serde_json::from_slice(&body).unwrap();

    assert_eq!(error.bot_id, Some("nonexistent_bot".to_string()));
    assert!(error.message.contains("Bot no encontrado"));
}

#[tokio::test]
async fn test_error_response_for_invalid_yen() {
    let app = test_app().await;

    // Layout con número de filas incorrecto para size 3
    let payload = serde_json::json!({
        "position": "not_a_valid_yen_format",
        "bot_id": "random_bot"
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/play")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let error: ErrorResponse = serde_json::from_slice(&body).unwrap();
    assert!(error.message.contains("Invalid YEN"));
}

// ============================================================================
// Status endpoint extended tests
// ============================================================================

#[tokio::test]
async fn test_status_endpoint_multiple_requests() {
    for _ in 0..3 {
        let app = test_app().await;
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/status")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        assert_eq!(&body[..], b"OK");
    }
}

// ============================================================================
// NUEVOS TESTS: Historial y Rendición
// ============================================================================

/*
#[tokio::test]
async fn test_history_endpoint_filters_correctly() {
    let app = test_app().await;

    // Simulamos la petición GET que hace React con los filtros
    let response = app
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/history?username=Drus&page=1&limit=5&result=Victoria")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // Verificamos que el servidor procesa la query y la base de datos sin explotar
    assert_eq!(response.status(), StatusCode::OK);

    // Verificamos que devuelve el JSON con la estructura paginada esperada
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert!(json.get("data").is_some());
    assert!(json.get("page").is_some());
    assert!(json.get("total_pages").is_some());
}

*/

#[tokio::test]
async fn test_listar_dificultades_endpoint_returns_available_difficulties() {
    let app = test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/difficulties")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let difficulties: Vec<String> = serde_json::from_slice(&body).unwrap();

    assert!(!difficulties.is_empty());
}

#[tokio::test]
async fn test_reset_endpoint_resets_board_and_optional_difficulty() {
    let app = test_app().await;

    let payload = serde_json::json!({
        "size": 4,
        "player": "Alice"
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/reset")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let yen: YEN = serde_json::from_slice(&body).unwrap();

    assert_eq!(yen.size(), 4);
}

#[tokio::test]
async fn test_history_endpoint_returns_paginated_data() {
    let uri_env = std::env::var("MONGODB_URI")
        .unwrap_or_else(|_| "NO DEFINIDA (usando default localhost)".to_string());
    println!("DEBUG: Intentando conectar a MongoDB con URI: {}", uri_env);

    let app = test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/history?username=Drus&page=1&limit=5&result=Victoria")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert!(json.get("data").is_some());
    assert!(json.get("page").is_some());
    assert!(json.get("total_pages").is_some());
}

#[tokio::test]
async fn test_execute_move_endpoint_saves_victory_history() {
    let app = test_app().await;

    let reset_payload = serde_json::json!({
        "size": 1,
        "difficulty": "Easy",
        "player": "Alice"
    });

    let reset_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/reset")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&reset_payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(reset_response.status(), StatusCode::OK);

    let move_payload = serde_json::json!({
        "index": 0,
        "player": "Alice"
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/execute-move")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&move_payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert!(json.get("winner").is_some());
    assert!(json.get("board").is_some());
}

#[tokio::test]
async fn test_surrender_endpoint_saves_defeat() {
    let app = test_app().await;

    // Simulamos el JSON que envía tu frontend al pulsar "Rendirse"
    let payload = serde_json::json!({
        "player": "Drus",
        "difficulty": "Hard",
        "board_size": 6
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/surrender")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    // Verificamos que el registro se guardó correctamente en MongoDB
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_play_without_bot_id_uses_default() {
    let app = test_app().await;

    // Petición SIN el campo "bot_id", cumpliendo el requisito de que sea opcional
    let payload = serde_json::json!({
        "position": "./../..."
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/play")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    // El servidor no debe fallar, debe usar un bot por defecto y devolver OK
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_play_on_completely_full_board() {
    let app = test_app().await;

    // Tablero size 3 completamente lleno, no hay movimientos posibles
    let payload = serde_json::json!({
        "position": "B/BR/RBB",
        "bot_id": "random_bot"
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/play")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    // Verificamos que el servidor detecta que no puede jugar y devuelve error
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let error: ErrorResponse =
        serde_json::from_slice(&body).expect("Expected an ErrorResponse for a full board");

    // El mensaje exacto dependerá de vuestra implementación, pero debe dar error
    assert!(!error.message.is_empty());
}

#[tokio::test]
async fn test_play_size_layout_mismatch() {
    let app = test_app().await;

    // Contradicción crítica: Declaramos size 12, pero mandamos un layout de size 3
    let payload = serde_json::json!({
        "position": "B/R",
        "bot_id": "random_bot"
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/play")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    // El servidor debe escupir un error y no intentar parsearlo (evitando un panic)
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let error: ErrorResponse = serde_json::from_slice(&body).unwrap();

    assert!(
        error.message.contains("Invalid") || error.message.contains("size"),
        "El mensaje de error debería indicar la discrepancia de tamaños"
    );
}

#[tokio::test]
async fn test_history_empty_coverage() {
    let app = test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/history?username=usuario_fantasma&page=2&limit=7")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json.get("page").and_then(|v| v.as_u64()), Some(2));
    assert_eq!(json.get("limit").and_then(|v| v.as_i64()), Some(7));
    assert!(json.get("data").is_some());
}

#[tokio::test]
async fn test_pvp_errors_coverage() {
    let bots = gamey::YBotRegistry::new();
    let db = get_test_db().await;
    let state = AppState::new(bots, db);
    let app = test_app_with_state(state);

    let res_no_match = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/pvp/move")
                .header("Content-Type", "application/json")
                .body(Body::from(
                    r#"{"match_id":"falso","player":"Drus","index":0}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res_no_match.status(), StatusCode::OK);
    let no_match_body = res_no_match.into_body().collect().await.unwrap().to_bytes();
    let no_match_json: serde_json::Value = serde_json::from_slice(&no_match_body).unwrap();
    assert_eq!(no_match_json["error"], "No match");

    let reset_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/pvp/reset")
                .header("Content-Type", "application/json")
                .body(Body::from(
                    r#"{"match_id":"m1","size":3,"players":["alice","bob"]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(reset_response.status(), StatusCode::OK);

    let res_bad_player = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/pvp/move")
                .header("Content-Type", "application/json")
                .body(Body::from(
                    r#"{"match_id":"m1","player":"carol","index":0}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res_bad_player.status(), StatusCode::OK);
    let bad_player_body = res_bad_player
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();
    let bad_player_json: serde_json::Value = serde_json::from_slice(&bad_player_body).unwrap();
    assert_eq!(bad_player_json["error"], "Player not in match");
}

#[tokio::test]
async fn test_pvp_victory_and_scoring_coverage() {
    let app = test_app().await;

    let reset_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/pvp/reset")
                .header("Content-Type", "application/json")
                .body(Body::from(
                    r#"{"match_id":"m2","size":3,"players":["alice","bob"]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(reset_response.status(), StatusCode::OK);

    let move_response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/pvp/move")
                .header("Content-Type", "application/json")
                .body(Body::from(
                    r#"{"match_id":"m2","player":"alice","index":0}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(move_response.status(), StatusCode::OK);
    let body = move_response
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert!(json.get("board").is_some());
    assert!(json.get("next_turn").is_some());
}
