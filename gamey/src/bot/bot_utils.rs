use crate::core::topology::TriangularTopology;
use crate::{Coordinates, GameY, PlayerId};
use std::collections::{HashMap, VecDeque};

pub fn get_opponent_id(my_id: PlayerId) -> PlayerId {
    if my_id == PlayerId::new(0) {
        PlayerId::new(1)
    } else {
        PlayerId::new(0)
    }
}

pub fn dist_to_center(coords: Coordinates, size: u32) -> f32 {
    let target = (size as f32) / 3.0;
    (coords.x() as f32 - target).abs()
        + (coords.y() as f32 - target).abs()
        + (coords.z() as f32 - target).abs()
}

pub fn calculate_all_distances(
    board: &GameY,
    player: PlayerId,
    opp_weight: i32,
) -> HashMap<u32, Vec<i32>> {
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

    seed_distances(board, player, side_mask, size, total, &mut dists, &mut queue);

    while let Some(curr) = queue.pop_front() {
        relax_neighbors(board, player, opp_weight, size, curr, &mut dists, &mut queue);
    }

    dists
}

fn seed_distances(
    board: &GameY,
    player: PlayerId,
    side_mask: u32,
    size: u32,
    total: u32,
    dists: &mut [i32],
    queue: &mut VecDeque<u32>,
) {
    for index in 0..total {
        let coords = Coordinates::from_index(index, size);
        if let Some(initial_distance) = initial_distance(board, player, side_mask, coords) {
            dists[index as usize] = initial_distance;
            queue.push_back(index);
        }
    }
}

fn initial_distance(
    board: &GameY,
    player: PlayerId,
    side_mask: u32,
    coords: Coordinates,
) -> Option<i32> {
    if (board.get_cell_regions(coords) & side_mask) == 0 {
        return None;
    }

    match board.get_player_at(coords) {
        Some(p) if p == player => Some(0),
        None => Some(1),
        _ => None,
    }
}

fn relax_neighbors(
    board: &GameY,
    player: PlayerId,
    opp_weight: i32,
    size: u32,
    current_index: u32,
    dists: &mut [i32],
    queue: &mut VecDeque<u32>,
) {
    let current_coords = Coordinates::from_index(current_index, size);

    for neighbor in board.get_neighbors(&current_coords) {
        let neighbor_index = neighbor.to_index(size);
        let new_distance =
            dists[current_index as usize] + movement_cost(board, player, opp_weight, neighbor);

        if should_update_distance(new_distance, dists[neighbor_index as usize]) {
            dists[neighbor_index as usize] = new_distance;
            queue.push_back(neighbor_index);
        }
    }
}

fn movement_cost(board: &GameY, player: PlayerId, opp_weight: i32, coords: Coordinates) -> i32 {
    match board.get_player_at(coords) {
        Some(p) if p == player => 0,
        None => 1,
        _ => opp_weight,
    }
}

fn should_update_distance(new_distance: i32, current_distance: i32) -> bool {
    new_distance < current_distance && new_distance < 50
}
