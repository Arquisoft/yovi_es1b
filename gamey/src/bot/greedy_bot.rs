use crate::{Coordinates, GameY, YBot, BotDifficulty};

pub struct GreedyBot;

impl GreedyBot {

}

impl YBot for GreedyBot {
    fn name(&self) -> &str {
        "greedy_bot"
    }

    fn difficulty(&self) -> BotDifficulty {
        BotDifficulty::Medium
    }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        let available_cells = board.available_cells();
        println!("{:?}", available_cells);
        return Some(Coordinates::new(0, 0, 0));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_greedy_bot_name() {
        let bot = GreedyBot;
        assert_eq!(bot.name(), "greedy_bot");
    }

    #[test]
    fn test_greedy_bot_difficulty() {
        let bot = GreedyBot;
        assert_eq!(bot.difficulty(), BotDifficulty::Medium);
    }
}
