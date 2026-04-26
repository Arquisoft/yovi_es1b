use crate::core::topology::TriangularTopology;
use crate::{BotDifficulty, Coordinates, GameY, PlayerId, YBot};
use std::collections::HashSet;

/// Bot bloqueador: Su estrategia principal es interrumpir el camino del oponente.
pub struct BlockerBot;

impl YBot for BlockerBot {
    fn name(&self) -> &str {
        "blocker_bot"
    }

    fn difficulty(&self) -> BotDifficulty {
        BotDifficulty::Medium
    }

    /// Elige el siguiente movimiento intentando bloquear al oponente.
    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        let my_id = board.next_player()?;
        let available_cells = board.available_cells();
        let size = board.board_size();
        let (opponent_cells, opponent_regions_mask) = collect_opponent_state(board, my_id, size);

        if opponent_cells.is_empty() {
            return fallback_move(available_cells, size);
        }

        let missing_sides = missing_sides(opponent_regions_mask);
        let candidates = collect_block_candidates(board, &opponent_cells, size);

        if candidates.is_empty() {
            return fallback_move(available_cells, size);
        }

        choose_best_candidate(
            board,
            &opponent_cells,
            &missing_sides,
            opponent_regions_mask,
            candidates,
        )
        .or_else(|| fallback_move(available_cells, size))
    }
}

fn collect_opponent_state(
    board: &GameY,
    my_id: PlayerId,
    size: u32,
) -> (HashSet<Coordinates>, u32) {
    let mut opponent_id = None;
    let mut opponent_cells = HashSet::new();
    let mut opponent_regions_mask = 0;

    for idx in 0..board.total_cells() {
        let coords = Coordinates::from_index(idx, size);
        let Some(pid) = board.get_player_at(coords) else {
            continue;
        };

        if pid == my_id {
            continue;
        }

        opponent_id.get_or_insert(pid);
        if Some(pid) == opponent_id {
            opponent_cells.insert(coords);
            opponent_regions_mask |= board.get_cell_regions(coords);
        }
    }

    (opponent_cells, opponent_regions_mask)
}

fn missing_sides(opponent_regions_mask: u32) -> Vec<u32> {
    [
        TriangularTopology::side_a(),
        TriangularTopology::side_b(),
        TriangularTopology::side_c(),
    ]
    .into_iter()
    .filter(|side| (opponent_regions_mask & side) == 0)
    .collect()
}

fn collect_block_candidates(
    board: &GameY,
    opponent_cells: &HashSet<Coordinates>,
    size: u32,
) -> Vec<Coordinates> {
    let mut candidates = HashSet::new();

    for &opp_coord in opponent_cells {
        for neighbor in board.get_neighbors(&opp_coord) {
            if board.get_player_at(neighbor).is_none() {
                candidates.insert(neighbor);
            }
        }
    }

    let mut deterministic_candidates: Vec<Coordinates> = candidates.into_iter().collect();
    deterministic_candidates.sort_by_key(|coords| coords.to_index(size));
    deterministic_candidates
}

fn choose_best_candidate(
    board: &GameY,
    opponent_cells: &HashSet<Coordinates>,
    missing_sides: &[u32],
    opponent_regions_mask: u32,
    candidates: Vec<Coordinates>,
) -> Option<Coordinates> {
    let mut best_candidate = None;
    let mut max_score = i32::MIN;

    for candidate in candidates {
        if board.get_player_at(candidate).is_some() {
            continue;
        }

        let score = evaluate_block(
            candidate,
            opponent_cells,
            board,
            missing_sides,
            opponent_regions_mask,
        );

        if score > max_score {
            max_score = score;
            best_candidate = Some(candidate);
        }
    }

    best_candidate
}

fn fallback_move(available_cells: &[u32], size: u32) -> Option<Coordinates> {
    available_cells
        .first()
        .map(|&idx| Coordinates::from_index(idx, size))
}

/// Funcion heuristica para evaluar que tan bueno es un movimiento de bloqueo.
fn evaluate_block(
    candidate: Coordinates,
    opponent_cells: &HashSet<Coordinates>,
    board: &GameY,
    missing_sides: &[u32],
    opponent_regions_mask: u32,
) -> i32 {
    let mut score = 0;

    for neighbor in board.get_neighbors(&candidate) {
        if opponent_cells.contains(&neighbor) {
            score += 10;
        }
    }

    let candidate_regions = board.get_cell_regions(candidate);

    for &side in missing_sides {
        if (candidate_regions & side) != 0 {
            score += 50;
        }

        score += distance_bonus(board, candidate, side);
    }

    score + achieved_side_distance_bonus(candidate, opponent_regions_mask)
}

fn distance_bonus(board: &GameY, candidate: Coordinates, side: u32) -> i32 {
    if side == TriangularTopology::side_a() {
        board.board_size() as i32 - candidate.x() as i32
    } else if side == TriangularTopology::side_b() {
        board.board_size() as i32 - candidate.y() as i32
    } else if side == TriangularTopology::side_c() {
        board.board_size() as i32 - candidate.z() as i32
    } else {
        0
    }
}

fn achieved_side_distance_bonus(candidate: Coordinates, opponent_regions_mask: u32) -> i32 {
    let mut score = 0;
    let sides = [
        (TriangularTopology::side_a(), candidate.x()),
        (TriangularTopology::side_b(), candidate.y()),
        (TriangularTopology::side_c(), candidate.z()),
    ];

    for (side, distance) in sides {
        if (opponent_regions_mask & side) != 0 {
            score += distance as i32 * 2;
        }
    }

    score
}
