use crate::core::topology::TriangularTopology;
use crate::{Coordinates, GameY, PlayerId, YBot, BotDifficulty};
use std::collections::{HashMap, VecDeque, HashSet};

pub struct AttackerBot;

impl YBot for AttackerBot {
    fn name(&self) -> &str {
        "attacker_bot"
    }

    fn difficulty(&self) -> BotDifficulty {
        BotDifficulty::Medium 
    }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        let my_id = board.next_player()?;
        let opponent_id = if my_id == PlayerId::new(0) {
            PlayerId::new(1)
        } else {
            PlayerId::new(0)
        };
        let size = board.board_size();

        // 1. INSTINTO ASESINO
        for &idx in board.available_cells() {
            let coords = Coordinates::from_index(idx, size);
            let mut simulated_board = board.clone();
            let test_move = crate::Movement::Placement { player: my_id, coords };
            
            if simulated_board.add_move(test_move).is_ok() {
                if let crate::core::game::GameStatus::Finished { winner } = simulated_board.status() {
                    if PlayerId::new(winner.id()) == my_id {
                        return Some(coords);
                    }
                }
            }
        }

        // 2. BOTÓN DE PÁNICO
        for &idx in board.available_cells() {
            let coords = Coordinates::from_index(idx, size);
            let mut simulated_board = board.clone();
            
            let test_move = crate::Movement::Placement { player: opponent_id, coords };
            if simulated_board.add_move(test_move).is_ok() {
                if let crate::core::game::GameStatus::Finished { winner } = simulated_board.status() {
                    if PlayerId::new(winner.id()) == opponent_id {
                        return Some(coords);
                    }
                }
            }
        }

        // 3. ESTRATEGIA DE ATAQUE DINÁMICA
        let my_dists = self.calculate_all_distances(board, my_id);
        let opp_dists = self.calculate_all_distances(board, opponent_id);

        let mut best_move = None;
        let mut best_score = f32::MIN;

        for &idx in board.available_cells() {
            let coords = Coordinates::from_index(idx, size);

            let my_p = self.get_exponential_potential(coords, &my_dists, size);
            let opp_p = self.get_exponential_potential(coords, &opp_dists, size);

            let center_dist = self.dist_to_center(coords, size);
            let centrality_bonus = size as f32 / (1.0 + center_dist); 

            let connectivity_bonus = self.check_connectivity_bonus(coords, board, my_id);

            // INTELIGENCIA DINÁMICA APLICADA
            let opp_threat_level = if opp_p > 2000.0 {
                5.0
            } else if opp_p > 500.0 {
                2.0
            } else {
                0.2
            };

            let total_score = (my_p * 10.0) + (opp_p * opp_threat_level) + centrality_bonus + connectivity_bonus;

            if total_score > best_score {
                best_score = total_score;
                best_move = Some(coords);
            }
        }
        best_move
    }
}

impl AttackerBot {
    fn calculate_all_distances(&self, board: &GameY, player: PlayerId) -> HashMap<u32, Vec<i32>> {
        let mut map = HashMap::new();
        map.insert(0, self.bfs_to_side(board, player, TriangularTopology::side_a()));
        map.insert(1, self.bfs_to_side(board, player, TriangularTopology::side_b()));
        map.insert(2, self.bfs_to_side(board, player, TriangularTopology::side_c()));
        map
    }

    fn bfs_to_side(&self, board: &GameY, player: PlayerId, side_mask: u32) -> Vec<i32> {
        let size = board.board_size();
        let total = board.total_cells();
        let mut dists = vec![100; total as usize];
        let mut queue = VecDeque::new();

        for i in 0..total {
            let c = Coordinates::from_index(i, size);
            if (board.get_cell_regions(c) & side_mask) != 0 {
                match board.get_player_at(c) {
                    Some(p) if p == player => {
                        dists[i as usize] = 0;
                        queue.push_back(i);
                    }
                    None => {
                        dists[i as usize] = 1;
                        queue.push_back(i);
                    }
                    _ => {} 
                }
            }
        }

        while let Some(curr) = queue.pop_front() {
            let curr_c = Coordinates::from_index(curr, size);
            for neighbor in board.get_neighbors(&curr_c) {
                let n_idx = neighbor.to_index(size);
                let weight = match board.get_player_at(neighbor) {
                    Some(p) if p == player => 0, 
                    None => 1,                   
                    _ => 100, 
                };
                let new_dist = dists[curr as usize] + weight;
                if new_dist < dists[n_idx as usize] && new_dist < 20 {
                    dists[n_idx as usize] = new_dist;
                    queue.push_back(n_idx);
                }
            }
        }
        dists
    }

    fn get_exponential_potential(&self, coords: Coordinates, dists: &HashMap<u32, Vec<i32>>, size: u32) -> f32 {
        let idx = coords.to_index(size) as usize;
        let mut score = 0.0;
        for dist_vec in dists.values() {
            let d = dist_vec[idx] as f32;
            score += 1000.0 / (d * d + 1.0);
        }
        score
    }

    fn dist_to_center(&self, coords: Coordinates, size: u32) -> f32 {
        let target = (size as f32) / 3.0;
        let dx = (coords.x() as f32 - target).abs();
        let dy = (coords.y() as f32 - target).abs();
        let dz = (coords.z() as f32 - target).abs();
        dx + dy + dz
    }

    fn check_connectivity_bonus(&self, coords: Coordinates, board: &GameY, my_id: PlayerId) -> f32 {
        let mut unique_neighbors = HashSet::new();
        
        for n in board.get_neighbors(&coords) {
            if board.get_player_at(n) == Some(my_id) {
                unique_neighbors.insert(n.to_index(board.board_size())); 
            }
        }

        match unique_neighbors.len() {
            0 => 0.0,
            1 => 15.0, 
            _ => 40.0, 
        }
    }
}