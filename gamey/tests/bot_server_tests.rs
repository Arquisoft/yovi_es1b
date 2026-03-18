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
/*
#[tokio::test]
async fn test_choose_endpoint_with_valid_request() {
    let app = test_app().await;

    // Create a valid YEN (Y-game Exchange Notation) for a size 3 board
    // Layout: empty board with 3 rows (size 3): row1=1cell, row2=2cells, row3=3cells
    let yen = YEN::new(3, 0, vec!['B', 'R'], "./../...".to_string());

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/ybot/choose/random_bot")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&yen).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    // Coordinates should be valid (we can't predict exactly which one the random bot picks)
}

    */
/*
#[tokio::test]
async fn test_choose_endpoint_with_partially_filled_board() {
    let app = test_app().await;

    // Board with some cells already filled: B in first cell, R in second
    let yen = YEN::new(3, 2, vec!['B', 'R'], "B/R./.B.".to_string());

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/ybot/choose/random_bot")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&yen).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}
*/
// ============================================================================
// Choose endpoint tests - Error cases
// ============================================================================
/*
#[tokio::test]
async fn test_choose_endpoint_with_invalid_api_version() {
    let app = test_app().await;

    let yen = YEN::new(3, 0, vec!['B', 'R'], "./../...".to_string());

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v2/ybot/choose/random_bot") // v2 is not supported
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&yen).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK); // Axum returns 200 with error JSON

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let error_response: ErrorResponse = serde_json::from_slice(&body).unwrap();

    assert!(error_response.message.contains("Unsupported API version"));
    assert_eq!(error_response.api_version, Some("v2".to_string()));
}
    */
/*
#[tokio::test]
async fn test_choose_endpoint_with_unknown_bot() {
    let app = test_app().await;

    let yen = YEN::new(3, 0, vec!['B', 'R'], "./../...".to_string());

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/ybot/choose/unknown_bot")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&yen).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let error_response: ErrorResponse = serde_json::from_slice(&body).unwrap();

    assert!(error_response.message.contains("Bot not found"));
    assert!(error_response.message.contains("unknown_bot"));
    assert_eq!(error_response.bot_id, Some("unknown_bot".to_string()));
}
*/

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
/*
#[tokio::test]
async fn test_choose_with_custom_bot_registry() {
    // Create a custom registry with only the random bot
    let bots = YBotRegistry::new().with_bot(Arc::new(RandomBot));
    let db = get_test_db().await; // Obtenemos la DB para el test
    let state = AppState::new(bots, db);
    let app = test_app_with_state(state);

    let yen = YEN::new(3, 0, vec!['B', 'R'], "./../...".to_string());

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/ybot/choose/random_bot")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&yen).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}
    */
/*
#[tokio::test]
async fn test_choose_with_empty_bot_registry() {
    // Create an empty registry
    let bots = YBotRegistry::new();
    let db = get_test_db().await; // Obtenemos la DB para el test
    let state = AppState::new(bots, db);
    let app = test_app_with_state(state);

    let yen = YEN::new(3, 0, vec!['B', 'R'], "./../...".to_string());

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/ybot/choose/random_bot")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&yen).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let error_response: ErrorResponse = serde_json::from_slice(&body).unwrap();

    assert!(error_response.message.contains("Bot not found"));
}
*/
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
/*
#[tokio::test]
async fn test_get_on_choose_endpoint_returns_method_not_allowed() {
    let app = test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/ybot/choose/random_bot")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::METHOD_NOT_ALLOWED);
}
    */

// ============================================================================
// Board size edge cases
// ============================================================================

#[tokio::test]
async fn test_choose_with_size_1_board() {
    let app = test_app().await;

    let payload = serde_json::json!({
        "position": YEN::new(1, 0, vec!['B', 'R'], ".".to_string()),
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
    assert!(!play_response.position.layout().contains('.'));
    assert_eq!(play_response.position.size(), 1);
}

#[tokio::test]
async fn test_choose_with_nearly_full_board() {
    let app = test_app().await;

    let payload = serde_json::json!({
        "position": YEN::new(3, 2, vec!['B', 'R'], "B/BR/BB.".to_string()),
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
    assert!(!play_response.position.layout().contains('.'));
    assert_eq!(play_response.position.size(), 3);
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

    let payload = serde_json::json!({ "position": yen, "bot_id": "blocker_bot" });

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
    let empty_after = play_response
        .position
        .layout()
        .chars()
        .filter(|c| *c == '.')
        .count();
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

    let payload = serde_json::json!({ "position": yen, "bot_id": "pro_bot" });

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
    let empty_after = play_response
        .position
        .layout()
        .chars()
        .filter(|c| *c == '.')
        .count();
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

        let payload = serde_json::json!({ "position": yen, "bot_id": bot_id });

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
        let empty_after = play_response
            .position
            .layout()
            .chars()
            .filter(|c| *c == '.')
            .count();
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

    let payload = serde_json::json!({ "position": yen, "bot_id": "random_bot" });

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
    let empty_after = play_response
        .position
        .layout()
        .chars()
        .filter(|c| *c == '.')
        .count();
    assert_eq!(empty_after, empty_before - 1);
}

// ============================================================================
// Error response structure tests
// ============================================================================

#[tokio::test]
async fn test_error_response_fields_for_unknown_bot() {
    let app = test_app().await;

    let payload = serde_json::json!({
        "position": YEN::new(3, 0, vec!['B', 'R'], "./../...".to_string()),
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
    assert!(error.message.contains("Bot not found"));
}

#[tokio::test]
async fn test_error_response_for_invalid_yen() {
    let app = test_app().await;

    // Layout con número de filas incorrecto para size 3
    let payload = serde_json::json!({
        "position": YEN::new(3, 0, vec!['B', 'R'], "B/RB".to_string()),
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
