use crate::bot::bot_utils;
use crate::{BotDifficulty, Coordinates, GameY, PlayerId, YBot};
use std::collections::{HashMap, HashSet};

pub struct AttackerBot;

impl YBot for AttackerBot {
    fn name(&self) -> &str {
        "attacker_bot"
    }

    fn difficulty(&self) -> BotDifficulty {
        BotDifficulty::Hard
    }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        let my_id = board.next_player()?;
        let opponent_id = bot_utils::get_opponent_id(my_id);
        let size = board.board_size();

        if let Some(priority_move) = self.find_priority_move(board, size, [my_id, opponent_id]) {
            return Some(priority_move);
        }

        let my_dists = bot_utils::calculate_all_distances(board, my_id, 100);
        let opp_dists = bot_utils::calculate_all_distances(board, opponent_id, 100);

        self.find_best_scored_move(board, my_id, size, &my_dists, &opp_dists)
    }
}

impl AttackerBot {
    fn find_priority_move(
        &self,
        board: &GameY,
        size: u32,
        priority_ids: [PlayerId; 2],
    ) -> Option<Coordinates> {
        for id in priority_ids {
            for &idx in board.available_cells() {
                let coords = Coordinates::from_index(idx, size);
                if self.is_winning_simulation(board, id, coords) {
                    return Some(coords);
                }
            }
        }

        None
    }

    fn is_winning_simulation(
        &self,
        board: &GameY,
        player_id: PlayerId,
        coords: Coordinates,
    ) -> bool {
        let mut sim = board.clone();
        if sim
            .add_move(crate::Movement::Placement {
                player: player_id,
                coords,
            })
            .is_err()
        {
            return false;
        }

        matches!(
            sim.status(),
            crate::core::game::GameStatus::Finished { winner }
                if PlayerId::new(winner.id()) == player_id
        )
    }

    fn find_best_scored_move(
        &self,
        board: &GameY,
        my_id: PlayerId,
        size: u32,
        my_dists: &HashMap<u32, Vec<i32>>,
        opp_dists: &HashMap<u32, Vec<i32>>,
    ) -> Option<Coordinates> {
        board.available_cells()
            .iter()
            .map(|&idx| {
                let coords = Coordinates::from_index(idx, size);
                let score = self.score_move(coords, board, my_id, size, my_dists, opp_dists);
                (coords, score)
            })
            .max_by(|(_, left_score), (_, right_score)| left_score.total_cmp(right_score))
            .map(|(coords, _)| coords)
    }

    fn score_move(
        &self,
        coords: Coordinates,
        board: &GameY,
        my_id: PlayerId,
        size: u32,
        my_dists: &HashMap<u32, Vec<i32>>,
        opp_dists: &HashMap<u32, Vec<i32>>,
    ) -> f32 {
        let my_p = self.get_attacker_potential(coords, my_dists, size);
        let opp_p = self.get_attacker_potential(coords, opp_dists, size);
        let centrality = bot_utils::dist_to_center(coords, size);
        let connectivity = self.check_connectivity_bonus(coords, board, my_id);
        let threat_level = self.threat_level(opp_p);

        (my_p * 10.0) + (opp_p * threat_level) + (size as f32 / (1.0 + centrality)) + connectivity
    }

    fn threat_level(&self, opponent_potential: f32) -> f32 {
        if opponent_potential > 2000.0 {
            25.0
        } else if opponent_potential > 800.0 {
            12.0
        } else {
            0.5
        }
    }

    fn get_attacker_potential(
        &self,
        coords: Coordinates,
        dists: &HashMap<u32, Vec<i32>>,
        size: u32,
    ) -> f32 {
        let idx = coords.to_index(size) as usize;
        let d1 = dists[&0][idx] as f32;
        let d2 = dists[&1][idx] as f32;
        let d3 = dists[&2][idx] as f32;
        50000.0 / (d1 * d1 + d2 * d2 + d3 * d3 + 1.0)
    }

    fn check_connectivity_bonus(&self, coords: Coordinates, board: &GameY, my_id: PlayerId) -> f32 {
        let mut unique = HashSet::new();
        for n in board.get_neighbors(&coords) {
            if board.get_player_at(n) == Some(my_id) {
                unique.insert(n.to_index(board.board_size()));
            }
        }
        match unique.len() {
            0 => -50.0,
            1 => 150.0,
            2 => 300.0,
            _ => 500.0,
        }
    }
}
