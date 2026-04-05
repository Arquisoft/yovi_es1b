//! Bot module for the Game of Y.
//!
//! This module provides the infrastructure for creating and managing AI bots
//! that can play the Game of Y. It includes:
//!
//! - [`YBot`] - A trait that defines the interface for all bots
//! - [`YBotRegistry`] - A registry for managing multiple bot implementations
//! - [`RandomBot`] - A simple bot that makes random valid moves

use std::sync::Arc;

pub mod blocker_bot;
pub mod pro_bot;
pub mod random;
pub mod attacker_bot;
pub mod ybot;
pub mod ybot_registry;
pub mod edge_bot;
pub mod bot_utils;

pub use blocker_bot::*;
pub use pro_bot::*;
pub use random::*;
pub use ybot::*;
pub use ybot_registry::*;
pub use edge_bot::*;
pub use attacker_bot::*;
pub use bot_utils::*;

/// Creates a new bot registry and populates it with all available bots.
///
/// This function provides a centralized way to get a registry with all
/// standard bots included.
pub fn create_default_registry() -> YBotRegistry {
    YBotRegistry::new()
        .with_bot(Arc::new(RandomBot))
        .with_bot(Arc::new(BlockerBot))
        .with_bot(Arc::new(ProBot))
        .with_bot(Arc::new(AttackerBot))
        .with_bot(Arc::new(EdgeBot))
}
