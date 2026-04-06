use crate::YBotRegistry;
use crate::core::game::GameY;
use mongodb::Database;
use std::sync::Arc;
use dashmap::DashMap;
use crate::BotDifficulty;

/// A single player's session
pub struct GameSession {
    pub game: GameY,
    pub current_difficulty: BotDifficulty,
    pub active_bot: String,
}

impl GameSession {
    pub fn new(size: u32) -> Self {
        Self {
            game: GameY::new(size),
            current_difficulty: BotDifficulty::Easy,
            active_bot: "random_bot".to_string(),
        }
    }
}

/// Shared application state for the bot server.
///
/// This struct holds the bot registry and is shared across all request handlers
/// via Axum's state extraction. It uses `Arc` internally to allow cheap cloning
/// for concurrent request handling.
#[derive(Clone)]
pub struct AppState {
    /// The registry of available bots, wrapped in Arc for thread-safe sharing.
    bots: Arc<YBotRegistry>,
    pub sessions: Arc<DashMap<String, GameSession>>, // NEW: Sessions keyed by username
    pub db: Database,
}

impl AppState {
    /// Creates a new application state with the given bot registry.
    pub fn new(bots: YBotRegistry, db: Database) -> Self {
        Self {
            bots: Arc::new(bots),
            sessions: Arc::new(DashMap::new()),
            db,                                        // Guardar la conexion
        }
    }

    /// Returns a clone of the Arc-wrapped bot registry.
    pub fn bots(&self) -> Arc<YBotRegistry> {
        Arc::clone(&self.bots)
    }

    /// Retrieves a session for a user, creating one if it doesn't exist
    pub fn get_or_create_session<'a>(&'a self, username: &str) -> dashmap::mapref::one::RefMut<'a, String, GameSession> {
        self.sessions.entry(username.to_string()).or_insert_with(|| GameSession::new(5))
    }
}

/*

#[cfg(test)]
mod tests {
    use super::*;
    use crate::RandomBot;

    // ... updated tests would go here ...
}

*/
