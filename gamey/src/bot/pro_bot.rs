use crate::core::topology::TriangularTopology;
use crate::{BotDifficulty, Coordinates, GameY, PlayerId, YBot};
use std::collections::{HashMap, VecDeque};

pub struct ProBot;

impl YBot for ProBot {
    fn name(&self) -> &str {
        "pro_bot"
    }

    fn difficulty(&self) -> BotDifficulty {
        BotDifficulty::Hard
    }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        let my_id = board.next_player()?;
        let opponent_id = if my_id == PlayerId::new(0) {
            PlayerId::new(1)
        } else {
            PlayerId::new(0)
        };
        let size = board.board_size();

        let my_dists = self.calculate_all_distances(board, my_id);
        let opp_dists = self.calculate_all_distances(board, opponent_id);

        let mut best_move = None;
        let mut best_score = f32::MIN;

        for &idx in board.available_cells() {
            let coords = Coordinates::from_index(idx, size);

            let my_p = self.get_exponential_potential(coords, &my_dists, size);
            let opp_p = self.get_exponential_potential(coords, &opp_dists, size);

            let mut opp_neighbors = 0;
            for n in board.get_neighbors(&coords) {
                if board.get_player_at(n) == Some(opponent_id) {
                    opp_neighbors += 1;
                }
            }

            let opp_block_bonus = if opp_neighbors >= 2 { 1000.0 } else { 0.0 };

            let center_dist = self.dist_to_center(coords, size);
            let centrality_bonus = (size as f32 / (1.0 + center_dist)) * 2.0;

            let connectivity_bonus = self.check_connectivity_bonus(coords, board, my_id);

            let total_score = (opp_p * 15.0)
                + (my_p * 1.0)
                + centrality_bonus
                + connectivity_bonus
                + opp_block_bonus;

            if total_score > best_score {
                best_score = total_score;
                best_move = Some(coords);
            }
        }
        best_move
    }
}

impl ProBot {
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
                    _ => 2, 
                };
                let new_dist = dists[curr as usize] + weight;
                if new_dist < dists[n_idx as usize] && new_dist < 50 {
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
            score += 1000.0 / (d.powi(4) + 1.0);
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
        let mut my_neighbors = 0;
        for n in board.get_neighbors(&coords) {
            if board.get_player_at(n) == Some(my_id) {
                my_neighbors += 1;
            }
        }
        if my_neighbors >= 2 { 15.0 } else { 0.0 }
    }
}