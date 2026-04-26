use crate::YBotRegistry;
use crate::core::game::GameY;
use mongodb::Database;
use std::sync::Arc;
use tokio::sync::Mutex; // Cambiamos std::sync::Mutex por tokio::sync::Mutex para async
use crate::BotDifficulty;
use dashmap::DashMap; // Necesitas añadir dashmap = "6.1" en Cargo.toml

/// Nueva estructura para aislar los datos de cada jugador
pub struct UserSession {
    pub game: Mutex<GameY>,
    pub current_difficulty: Mutex<BotDifficulty>,
    pub active_bot: Mutex<String>,
}

/// Sesion de partida multijugador 1v1.
pub struct PvpSession {
    pub game: Mutex<GameY>,
    pub players: Mutex<Vec<String>>,
}

#[derive(Clone)]
pub struct AppState {
    bots: Arc<YBotRegistry>,
    /// Mapa concurrente que asocia "username" -> Sesión individual
    pub sessions: Arc<DashMap<String, Arc<UserSession>>>,
    /// Mapa concurrente que asocia "match_id" -> sesion PvP.
    pub pvp_sessions: Arc<DashMap<String, Arc<PvpSession>>>,
    pub db: Database,
}

impl AppState {
    pub fn new(bots: YBotRegistry, db: Database) -> Self {
        Self {
            bots: Arc::new(bots),
            sessions: Arc::new(DashMap::new()),
            pvp_sessions: Arc::new(DashMap::new()),
            db,
        }
    }

    /// Método de utilidad para recuperar la partida de un usuario o crear una nueva si no existe
    pub async fn get_or_create_session(&self, username: &str) -> Arc<UserSession> {
        if let Some(session) = self.sessions.get(username) {
            return Arc::clone(session.value());
        }

        let new_session = Arc::new(UserSession {
            game: Mutex::new(GameY::new(5)),
            current_difficulty: Mutex::new(BotDifficulty::Easy),
            active_bot: Mutex::new("random_bot".to_string()),
        });

        self.sessions.insert(username.to_string(), Arc::clone(&new_session));
        new_session
    }

    pub fn bots(&self) -> Arc<YBotRegistry> {
        Arc::clone(&self.bots)
    }

    pub fn upsert_pvp_session(&self, match_id: &str, board_size: u32, players: Vec<String>) -> Arc<PvpSession> {
        let session = Arc::new(PvpSession {
            game: Mutex::new(GameY::new(board_size)),
            players: Mutex::new(players),
        });

        self.pvp_sessions.insert(match_id.to_string(), Arc::clone(&session));
        session
    }

    pub fn get_pvp_session(&self, match_id: &str) -> Option<Arc<PvpSession>> {
        self.pvp_sessions.get(match_id).map(|entry| Arc::clone(entry.value()))
    }
}