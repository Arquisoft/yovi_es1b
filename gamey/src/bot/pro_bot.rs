use crate::bot::bot_utils;
use crate::{BotDifficulty, Coordinates, GameY, YBot};

pub struct ProBot;

impl YBot for ProBot {
    fn name(&self) -> &str { "pro_bot" }
    fn difficulty(&self) -> BotDifficulty { BotDifficulty::Hard }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        let my_id = board.next_player()?;
        let opponent_id = bot_utils::get_opponent_id(my_id);
        let size = board.board_size();

        let my_dists = bot_utils::calculate_all_distances(board, my_id, 2);
        let opp_dists = bot_utils::calculate_all_distances(board, opponent_id, 2);

        let mut best_move = None;
        let mut best_score = f32::MIN;

        for &idx in board.available_cells() {
            let coords = Coordinates::from_index(idx, size);
            
            // Fórmula específica: Suma de potenciales individuales d^4
            let my_p = self.get_pro_potential(coords, &my_dists, size);
            let opp_p = self.get_pro_potential(coords, &opp_dists, size);

            let opp_neighbors = board.get_neighbors(&coords).into_iter()
                .filter(|&n| board.get_player_at(n) == Some(opponent_id)).count();
            
            let block_bonus = if opp_neighbors >= 2 { 1000.0 } else { 0.0 };
            let centrality = (size as f32 / (1.0 + bot_utils::dist_to_center(coords, size))) * 2.0;

            let total_score = (opp_p * 15.0) + (my_p * 1.0) + centrality + block_bonus;

            if total_score > best_score {
                best_score = total_score;
                best_move = Some(coords);
            }
        }
        best_move
    }
}

impl ProBot {
    fn get_pro_potential(&self, coords: Coordinates, dists: &std::collections::HashMap<u32, Vec<i32>>, size: u32) -> f32 {
        let idx = coords.to_index(size) as usize;
        let mut score = 0.0;
        for dist_vec in dists.values() {
            let d = dist_vec[idx] as f32;
            score += 1000.0 / (d.powi(4) + 1.0);
        }
        score
    }
}