use crate::{Coordinates, GameY, YBot, BotDifficulty};
use rand::prelude::IndexedRandom;

pub struct EdgeBot;

impl YBot for EdgeBot {
    fn name(&self) -> &str {
        "edge_bot"
    }

    fn difficulty(&self) -> BotDifficulty {
        BotDifficulty::Easy 
    }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        let size = board.board_size();
        let mut edge_cells = Vec::new();

        
       
        // Calculamos fila y columna 
        for &idx in board.available_cells() {
            let mut row = 0;
            let mut current_row_start = 0;
            
            // Averiguar en qué fila estamos calculando la secuencia de números triangulares
            while current_row_start + row + 1 <= idx {
                row += 1;
                current_row_start += row;
            }
            
            // Averiguar en qué columna estamos dentro de esa fila
            let col = idx - current_row_start;

           
            //  Borde izquierdo: la columna es 0.
            //  Borde derecho: la columna es igual a la fila.
            //  Borde inferior: la fila es igual al tamaño del tablero menos 1.
            if col == 0 || col == row || row == size - 1 {
                // Solo si cumple, construimos la Coordenada para que el motor la entienda
                edge_cells.push(Coordinates::from_index(idx, size));
            }
        }

        let mut rng = rand::rng();

       
        if !edge_cells.is_empty() {
            edge_cells.choose(&mut rng).copied()
        } else {
            // Fallback por si el borde está lleno
            let avail = board.available_cells();
            if avail.is_empty() {
                return None;
            }
            let &random_idx = avail.choose(&mut rng)?;
            Some(Coordinates::from_index(random_idx, size))
        }
    }
}