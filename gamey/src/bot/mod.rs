//! Bot module for the Game of Y.
//!
//! This module provides the infrastructure for creating and managing AI bots
//! that can play the Game of Y. It includes:
//!
//! - [`YBot`] - A trait that defines the interface for all bots
//! - [`YBotRegistry`] - A registry for managing multiple bot implementations
//! - [`RandomBot`] - A simple bot that makes random valid moves

pub mod blocker_bot;
pub mod greedy_bot;
pub mod pro_bot;
pub mod random;
pub mod ybot;
pub mod ybot_registry;
pub use blocker_bot::*;
pub use greedy_bot::*;
pub use pro_bot::*;
pub use random::*;
pub use ybot::*;
pub use ybot_registry::*;
