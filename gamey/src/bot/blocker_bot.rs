use crate::{Coordinates, GameY, YBot, PlayerId, BotDifficulty};
use crate::core::topology::TriangularTopology;
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
        // 1. Identificar quién soy (mi ID de jugador).
        let my_id = match board.next_player() {
            Some(id) => id,
            None => return None, // Si el juego terminó, no hay movimiento.
        };

        let available_cells = board.available_cells();
        let size = board.board_size();

        // 2. Escanear el tablero para encontrar al oponente y sus fichas.
        //    - opponent_id: Guardará el ID del jugador contrario.
        //    - opponent_cells: Conjunto de coordenadas donde el oponente tiene fichas.
        //    - opponent_regions_mask: Máscara de bits que indica qué lados del tablero ya ha tocado el oponente.
        let mut opponent_id: Option<PlayerId> = None;
        let mut opponent_cells = HashSet::new();
        let mut opponent_regions_mask: u32 = 0;
        let total_cells = board.total_cells();

        for idx in 0..total_cells {
            let coords = Coordinates::from_index(idx, size);
            // Verificamos quién ocupa la celda actual
            if let Some(pid) = board.get_player_at(coords) {
                // Si la celda está ocupada por alguien que NO soy yo...
                if pid != my_id {
                    // Si es la primera ficha enemiga que veo, guardo su ID como "el oponente".
                    if opponent_id.is_none() {
                        opponent_id = Some(pid);
                    }

                    // Si esta ficha pertenece al oponente identificado...
                    if Some(pid) == opponent_id {
                        // ...la añado a su lista de celdas ocupadas.
                        opponent_cells.insert(coords);
                        // ...y actualizo la máscara de regiones (lados) que ha tocado.
                        opponent_regions_mask |= board.get_cell_regions(coords);
                    }
                }
            }
        }

        // Si no encontramos fichas del oponente (ej. soy el primer jugador), jugamos una celda válida cualquiera.
        if opponent_cells.is_empty() {
            if !available_cells.is_empty() {
                 let idx = available_cells[0];
                 return Some(Coordinates::from_index(idx, size));
            }
            return None;
        }

        // 3. Determinar qué lados le faltan al oponente para ganar.
        //    Obtenemos las máscaras de bits para cada lado (A, B, C) desde la topología.
        let side_a = TriangularTopology::side_a();
        let side_b = TriangularTopology::side_b();
        let side_c = TriangularTopology::side_c();

        let mut missing_sides = Vec::new();
        // Si la máscara del oponente no tiene el bit del lado A, es que le falta conectar con A.
        if (opponent_regions_mask & side_a) == 0 { missing_sides.push(side_a); }
        if (opponent_regions_mask & side_b) == 0 { missing_sides.push(side_b); }
        if (opponent_regions_mask & side_c) == 0 { missing_sides.push(side_c); }

        // 4. Buscar candidatos: Celdas vacías adyacentes a las fichas del oponente.
        //    Solo tiene sentido bloquear donde el oponente ya está o hacia donde puede expandirse.
        let mut candidates = HashSet::new();
        for &opp_coord in &opponent_cells {
            let neighbors = board.get_neighbors(&opp_coord);
            for neighbor in neighbors {
                // Solo nos interesan los vecinos que estén vacíos.
                if board.get_player_at(neighbor).is_none() {
                    candidates.insert(neighbor);
                }
            }
        }

        // Si no hay candidatos de bloqueo directo (raro, salvo tablero lleno), jugamos cualquiera disponible.
        if candidates.is_empty() {
             if !available_cells.is_empty() {
                 let idx = available_cells[0];
                 return Some(Coordinates::from_index(idx, size));
            }
            return None;
        }

        // 5. Evaluar candidatos: Asignar una puntuación a cada celda candidata.
        let mut best_candidate = None;
        let mut max_score = i32::MIN;

        for &candidate in &candidates {
            let score = evaluate_block(candidate, &opponent_cells, board, &missing_sides, opponent_regions_mask);
            // Nos quedamos con el candidato que tenga la mayor puntuación.
            if score > max_score {
                max_score = score;
                best_candidate = Some(candidate);
            }
        }

        best_candidate
    }
}

/// Función heurística para evaluar qué tan bueno es un movimiento de bloqueo.
fn evaluate_block(
    candidate: Coordinates,
    opponent_cells: &HashSet<Coordinates>,
    board: &GameY,
    missing_sides: &[u32],
    opponent_regions_mask: u32
) -> i32 {
    let mut score = 0;

    // Factor 1: Interrupción de conectividad local.
    // Sumamos puntos por cada ficha del oponente adyacente a este candidato.
    // Bloquear una celda que toca muchas fichas enemigas
    let neighbors = board.get_neighbors(&candidate);
    for neighbor in neighbors {
        if opponent_cells.contains(&neighbor) {
            score += 10; // Puntuación base por bloquear una conexión.
        }
    }

    // Factor 2: Bloqueo estratégico basado en los lados del tablero.
    let candidate_regions = board.get_cell_regions(candidate);

    // Iteramos sobre los lados que al oponente LE FALTAN.
    for &side in missing_sides {
        // Si el candidato toca directamente un lado que le falta al oponente, es un bloqueo crítico.
        if (candidate_regions & side) != 0 {
            score += 50; // Gran bonificación.
        }

        // Si no toca el lado, ¿está "cerca" de ese lado?
        // Usamos la geometría de coordenadas para estimar cercanía:
        // - Lado A (x=0): Cuanto menor sea x, más cerca.
        // - Lado B (y=0): Cuanto menor sea y, más cerca.
        // - Lado C (z=0): Cuanto menor sea z, más cerca.
        // Bonificamos estar cerca de los lados objetivo del oponente.
        let dist_bonus = if side == TriangularTopology::side_a() {
             board.board_size() as i32 - candidate.x() as i32
        } else if side == TriangularTopology::side_b() {
             board.board_size() as i32 - candidate.y() as i32
        } else if side == TriangularTopology::side_c() {
             board.board_size() as i32 - candidate.z() as i32
        } else {
            0
        };
        score += dist_bonus;
    }

    // Factor 3: Alejarse de los lados ya conseguidos.
    // La estrategia pide "tapar la celda que esté más lejana a la pared o paredes ya cumplidas".
    // Esto evita desperdiciar bloqueos en zonas donde el oponente ya ha tenido éxito.

    let side_a = TriangularTopology::side_a();
    let side_b = TriangularTopology::side_b();
    let side_c = TriangularTopology::side_c();

    // Si el oponente ya tiene el lado A (x=0), preferimos celdas con x GRANDE (lejos de A).
    if (opponent_regions_mask & side_a) != 0 {
        score += candidate.x() as i32 * 2;
    }
    // Si el oponente ya tiene el lado B (y=0), preferimos celdas con y GRANDE (lejos de B).
    if (opponent_regions_mask & side_b) != 0 {
        score += candidate.y() as i32 * 2;
    }
    // Si el oponente ya tiene el lado C (z=0), preferimos celdas con z GRANDE (lejos de C).
    if (opponent_regions_mask & side_c) != 0 {
        score += candidate.z() as i32 * 2;
    }

    score
}
