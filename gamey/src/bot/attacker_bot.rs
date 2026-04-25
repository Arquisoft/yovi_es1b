use crate::bot::bot_utils;
use crate::{Coordinates, GameY, PlayerId, YBot, BotDifficulty};
use std::collections::{HashMap, HashSet};

pub struct AttackerBot;

impl YBot for AttackerBot {
    fn name(&self) -> &str { "attacker_bot" }
    fn difficulty(&self) -> BotDifficulty { BotDifficulty::Hard }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        let my_id = board.next_player()?;
        let opponent_id = bot_utils::get_opponent_id(my_id);
        let size = board.board_size();

        // Prioridades de simulación (Victoria/Bloqueo)
        for id in [my_id, opponent_id] {
            for &idx in board.available_cells() {
                let coords = Coordinates::from_index(idx, size);
                let mut sim = board.clone();
                if sim.add_move(crate::Movement::Placement { player: id, coords }).is_ok() {
                    if let crate::core::game::GameStatus::Finished { winner } = sim.status() {
                        if PlayerId::new(winner.id()) == id { return Some(coords); }
                    }
                }
            }
        }

       //Cálculo de distancias
        let my_dists = bot_utils::calculate_all_distances(board, my_id, 100);
        let opp_dists = bot_utils::calculate_all_distances(board, opponent_id, 100);
        
        let mut best_move = None;
        let mut best_score = f32::MIN;

        for &idx in board.available_cells() {
            let coords = Coordinates::from_index(idx, size);
            
            // Fórmula específica: Suma de cuadrados
            let my_p = self.get_attacker_potential(coords, &my_dists, size);
            let opp_p = self.get_attacker_potential(coords, &opp_dists, size);

            let centrality = bot_utils::dist_to_center(coords, size);
            let connectivity = self.check_connectivity_bonus(coords, board, my_id);

            let threat_level = if opp_p > 2000.0 { 25.0 } else if opp_p > 800.0 { 12.0 } else { 0.5 };
            
            let total_score = (my_p * 10.0) + (opp_p * threat_level) + (size as f32 / (1.0 + centrality)) + connectivity;

            if total_score > best_score {
                best_score = total_score;
                best_move = Some(coords);
            }
        }
        best_move
    }
}

impl AttackerBot {
    fn get_attacker_potential(&self, coords: Coordinates, dists: &HashMap<u32, Vec<i32>>, size: u32) -> f32 {
        let idx = coords.to_index(size) as usize;
        let d1 = dists[&0][idx] as f32;
        let d2 = dists[&1][idx] as f32;
        let d3 = dists[&2][idx] as f32;
        50000.0 / (d1*d1 + d2*d2 + d3*d3 + 1.0)
    }

    fn check_connectivity_bonus(&self, coords: Coordinates, board: &GameY, my_id: PlayerId) -> f32 {
        let mut unique = HashSet::new();
        for n in board.get_neighbors(&coords) {
            if board.get_player_at(n) == Some(my_id) { unique.insert(n.to_index(board.board_size())); }
        }
        match unique.len() { 0 => -50.0, 1 => 150.0, 2 => 300.0, _ => 500.0 }
    }
}