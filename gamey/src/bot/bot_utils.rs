use crate::core::topology::TriangularTopology;
use crate::{Coordinates, GameY, PlayerId};
use std::collections::{HashMap, VecDeque};

pub fn get_opponent_id(my_id: PlayerId) -> PlayerId {
    if my_id == PlayerId::new(0) { PlayerId::new(1) } else { PlayerId::new(0) }
}

pub fn dist_to_center(coords: Coordinates, size: u32) -> f32 {
    let target = (size as f32) / 3.0;
    (coords.x() as f32 - target).abs() + 
    (coords.y() as f32 - target).abs() + 
    (coords.z() as f32 - target).abs()
}

pub fn calculate_all_distances(board: &GameY, player: PlayerId, opp_weight: i32) -> HashMap<u32, Vec<i32>> {
    let mut map = HashMap::new();
    map.insert(0, bfs_to_side(board, player, TriangularTopology::side_a(), opp_weight));
    map.insert(1, bfs_to_side(board, player, TriangularTopology::side_b(), opp_weight));
    map.insert(2, bfs_to_side(board, player, TriangularTopology::side_c(), opp_weight));
    map
}

fn bfs_to_side(board: &GameY, player: PlayerId, side_mask: u32, opp_weight: i32) -> Vec<i32> {
    let size = board.board_size();
    let total = board.total_cells();
    let mut dists = vec![100; total as usize];
    let mut queue = VecDeque::new();

    for i in 0..total {
        let c = Coordinates::from_index(i, size);
        if (board.get_cell_regions(c) & side_mask) != 0 {
            match board.get_player_at(c) {
                Some(p) if p == player => { dists[i as usize] = 0; queue.push_back(i); }
                None => { dists[i as usize] = 1; queue.push_back(i); }
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
                _ => opp_weight, 
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