//! Registry for managing YBot implementations.
//!
//! The [`YBotRegistry`] provides a centralized way to register and retrieve
//! bot implementations by name.

use std::{collections::HashMap, sync::Arc};
use rand::prelude::IndexedRandom;

use crate::{YBot, BotDifficulty};

/// A registry that stores and manages [`YBot`] implementations.
///
/// The registry allows bots to be registered and retrieved by their name,
/// making it easy to dynamically select bots at runtime.
///
/// # Example
///
/// ```
/// use std::sync::Arc;
/// use gamey::{YBotRegistry, RandomBot};
///
/// let registry = YBotRegistry::new()
///     .with_bot(Arc::new(RandomBot));
///
/// let bot = registry.find("random_bot");
/// assert!(bot.is_some());
/// ```
pub struct YBotRegistry {
    bots: HashMap<String, Arc<dyn YBot>>,
}

impl YBotRegistry {
    /// Creates a new empty registry.
    pub fn new() -> Self {
        YBotRegistry {
            bots: HashMap::new(),
        }
    }

    /// Adds a bot to the registry and returns the registry for chaining.
    ///
    /// The bot is registered under its name (as returned by [`YBot::name`]).
    pub fn with_bot(mut self, bot: Arc<dyn YBot>) -> Self {
        self.bots.insert(bot.name().to_string(), bot);
        self
    }

    /// Finds a bot by name.
    ///
    /// Returns `Some(bot)` if a bot with the given name exists, `None` otherwise.
    pub fn find(&self, name: &str) -> Option<Arc<dyn YBot>> {
        self.bots.get(name).cloned()
    }

    /// Returns a list of all registered bot names.
    pub fn names(&self) -> Vec<String> {
        self.bots.keys().cloned().collect()
    }

    /// Obtiene un bot aleatorio que coincida con la dificultad dada.
    ///
    /// Filtra todos los bots registrados por la dificultad especificada y selecciona uno al azar.
    /// Devuelve `None` si no hay bots registrados para esa dificultad.
    pub fn get_random_bot_by_difficulty(&self, difficulty: BotDifficulty) -> Option<Arc<dyn YBot>> {
        let matching_bots: Vec<_> = self.bots.values()
            .filter(|bot| bot.difficulty() == difficulty)
            .cloned()
            .collect();

        if matching_bots.is_empty() {
            return None;
        }

        matching_bots.choose(&mut rand::rng()).cloned()
    }
}

impl Default for YBotRegistry {
    fn default() -> Self {
        YBotRegistry::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Coordinates, GameY, RandomBot};

    /// A mock bot for testing purposes.
    struct MockBot {
        name: String,
        difficulty: BotDifficulty,
    }

    impl MockBot {
        fn new(name: &str, difficulty: BotDifficulty) -> Self {
            MockBot {
                name: name.to_string(),
                difficulty,
            }
        }
    }

    impl YBot for MockBot {
        fn name(&self) -> &str {
            &self.name
        }

        fn difficulty(&self) -> BotDifficulty {
            self.difficulty
        }

        fn choose_move(&self, _board: &GameY) -> Option<Coordinates> {
            None
        }
    }

    #[test]
    fn test_new_registry_is_empty() {
        let registry = YBotRegistry::new();
        assert!(registry.names().is_empty());
    }

    #[test]
    fn test_default_registry_is_empty() {
        let registry = YBotRegistry::default();
        assert!(registry.names().is_empty());
    }

    #[test]
    fn test_with_bot_adds_bot() {
        let registry = YBotRegistry::new().with_bot(Arc::new(MockBot::new("test_bot", BotDifficulty::Easy)));

        assert_eq!(registry.names().len(), 1);
        assert!(registry.find("test_bot").is_some());
    }

    #[test]
    fn test_with_bot_chaining() {
        let registry = YBotRegistry::new()
            .with_bot(Arc::new(MockBot::new("bot1", BotDifficulty::Easy)))
            .with_bot(Arc::new(MockBot::new("bot2", BotDifficulty::Easy)));

        assert_eq!(registry.names().len(), 2);
        assert!(registry.find("bot1").is_some());
        assert!(registry.find("bot2").is_some());
    }

    #[test]
    fn test_find_nonexistent_bot_returns_none() {
        let registry = YBotRegistry::new();
        assert!(registry.find("nonexistent").is_none());
    }

    #[test]
    fn test_with_random_bot() {
        let registry = YBotRegistry::new().with_bot(Arc::new(RandomBot));

        assert!(registry.find("random_bot").is_some());
    }

    #[test]
    fn test_duplicate_name_overwrites() {
        let bot1 = Arc::new(MockBot::new("same_name", BotDifficulty::Easy));
        let bot2 = Arc::new(MockBot::new("same_name", BotDifficulty::Easy));

        let registry = YBotRegistry::new().with_bot(bot1).with_bot(bot2);

        assert_eq!(registry.names().len(), 1);
    }

    #[test]
    fn test_get_random_bot_by_difficulty() {
        let registry = YBotRegistry::new()
            .with_bot(Arc::new(MockBot::new("easy1", BotDifficulty::Easy)))
            .with_bot(Arc::new(MockBot::new("hard1", BotDifficulty::Hard)));

        let easy_bot = registry.get_random_bot_by_difficulty(BotDifficulty::Easy);
        assert!(easy_bot.is_some());
        assert_eq!(easy_bot.unwrap().difficulty(), BotDifficulty::Easy);

        let hard_bot = registry.get_random_bot_by_difficulty(BotDifficulty::Hard);
        assert!(hard_bot.is_some());
        assert_eq!(hard_bot.unwrap().difficulty(), BotDifficulty::Hard);

        let medium_bot = registry.get_random_bot_by_difficulty(BotDifficulty::Medium);
        assert!(medium_bot.is_none());
    }
}
