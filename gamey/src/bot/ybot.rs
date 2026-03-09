use crate::{Coordinates, GameY};
use std::fmt;
use std::str::FromStr;

/// Nivel de dificultad para los bots
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BotDifficulty {
    Easy,
    Medium,
    Hard,
}

impl BotDifficulty {
    /// Devuelve todas las variantes de dificultad disponibles
    pub fn all() -> Vec<BotDifficulty> {
        vec![BotDifficulty::Easy, BotDifficulty::Medium, BotDifficulty::Hard]
    }
}

impl fmt::Display for BotDifficulty {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            BotDifficulty::Easy => write!(f, "Easy"),
            BotDifficulty::Medium => write!(f, "Medium"),
            BotDifficulty::Hard => write!(f, "Hard"),
        }
    }
}

impl FromStr for BotDifficulty {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "easy" | "facil" => Ok(BotDifficulty::Easy),
            "medium" | "medio" => Ok(BotDifficulty::Medium),
            "hard" | "dificil" => Ok(BotDifficulty::Hard),
            _ => Err(format!("Dificultad desconocida: {}", s)),
        }
    }
}

/// Trait representing a Y game bot (YBot)
/// A YBot is an AI that can choose moves in the game of Y.
/// Implementors of this trait must provide a name and a method to choose a move given the current game state.
pub trait YBot: Send + Sync {
    /// Returns the name of the bot.
    fn name(&self) -> &str;

    /// Devuelve la dificultad del bot.
    fn difficulty(&self) -> BotDifficulty;

    /// Chooses a move based on the current game state.
    fn choose_move(&self, board: &GameY) -> Option<Coordinates>;
}
