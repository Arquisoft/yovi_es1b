use crate::YBotRegistry;
use crate::core::game::GameY;
use mongodb::Database;
use std::sync::Arc;
use std::sync::Mutex;
use crate::BotDifficulty;

/// Shared application state for the bot server.
///
/// This struct holds the bot registry and is shared across all request handlers
/// via Axum's state extraction. It uses `Arc` internally to allow cheap cloning
/// for concurrent request handling.
#[derive(Clone)]
pub struct AppState {
    /// The registry of available bots, wrapped in Arc for thread-safe sharing.
    bots: Arc<YBotRegistry>,
    pub game: Arc<Mutex<GameY>>, // NEW: The actual game state, wrapped in Arc and Mutex for safe concurrent access
    pub current_difficulty: Arc<Mutex<BotDifficulty>>, // NEW: The current difficulty level
    pub db: Database,
    pub active_bot: Arc<Mutex<String>>,
}



impl AppState {
    /// Creates a new application state with the given bot registry.
    pub fn new(bots: YBotRegistry, db: Database) -> Self {
        Self {
            bots: Arc::new(bots),
            game: Arc::new(Mutex::new(GameY::new(5))), // NEW: Initialize the game state with a new GameY instance of size 5
            current_difficulty: Arc::new(Mutex::new(BotDifficulty::Easy)), // Default difficulty
            db,                                        // Guardar la conexion
            active_bot: Arc::new(Mutex::new("random_bot".to_string())), // Default active bot
        }
    }

    /// Returns a clone of the Arc-wrapped bot registry.
    pub fn bots(&self) -> Arc<YBotRegistry> {
        Arc::clone(&self.bots)
    }
}

/*

#[cfg(test)]
mod tests {
    use super::*;
    use crate::RandomBot;

    #[test]
    fn test_new_state() {
        let registry = YBotRegistry::new();
        let state = AppState::new(registry);
        assert!(state.bots().names().is_empty());
    }

    #[test]
    fn test_state_with_bot() {
        let registry = YBotRegistry::new().with_bot(Arc::new(RandomBot));
        let state = AppState::new(registry);
        assert!(state.bots().names().contains(&"random_bot".to_string()));
    }

    #[test]
    fn test_state_clone() {
        let registry = YBotRegistry::new().with_bot(Arc::new(RandomBot));
        let state = AppState::new(registry);
        let cloned = state.clone();
        // Both should reference the same underlying data
        assert_eq!(state.bots().names(), cloned.bots().names());
    }

    #[test]
    fn test_bots_arc_clone() {
        let registry = YBotRegistry::new().with_bot(Arc::new(RandomBot));
        let state = AppState::new(registry);
        let bots1 = state.bots();
        let bots2 = state.bots();
        // Both Arcs should point to the same registry
        assert_eq!(bots1.names(), bots2.names());
    }
}

*/
