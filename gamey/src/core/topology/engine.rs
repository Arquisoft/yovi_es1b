//! Motor de Juego Genérico.
//!
//! Gestiona el estado del juego y la conectividad (Union-Find) sin saber la forma del tablero.

use crate::PlayerId;
use super::{BoardTopology, CellIndex, RegionMask};

/// Estructura auxiliar para el algoritmo Union-Find.
#[derive(Clone, Debug)]
pub struct DisjointSet {
    pub parent: usize,
    /// Máscara de bits de todas las regiones que este conjunto toca.
    pub regions_touched: RegionMask,
}

/// El Motor de Juego Genérico.
#[derive(Clone, Debug)]
pub struct GameEngine<T: BoardTopology> {
    pub topology: T,
    /// Estado del tablero: Quién ocupa cada celda (None si está vacía).
    pub state: Vec<Option<PlayerId>>,
    /// Estructura Union-Find para rastrear grupos conectados.
    pub sets: Vec<DisjointSet>,
    /// Mapa que dice a qué conjunto (set) pertenece cada celda ocupada.
    pub cell_set_map: Vec<Option<usize>>,
}

impl<T: BoardTopology> GameEngine<T> {
    /// Crea un nuevo motor de juego con la topología dada.
    pub fn new(topology: T) -> Self {
        let size = topology.total_cells();
        Self {
            topology,
            state: vec![None; size],
            sets: Vec::new(),
            cell_set_map: vec![None; size],
        }
    }

    /// Intenta realizar un movimiento en la celda especificada por el jugador.
    /// Devuelve Ok(true) si el movimiento ganó el juego, Ok(false) si no, o Err si es inválido.
    pub fn make_move(&mut self, cell: CellIndex, player: PlayerId) -> Result<bool, String> {
        if cell >= self.topology.total_cells() {
            return Err(format!("Celda fuera de límites: {}", cell));
        }
        if self.state[cell].is_some() {
            return Err(format!("Celda ocupada: {}", cell));
        }

        // 1. Colocar Pieza
        self.state[cell] = Some(player);

        // 2. Crear nuevo Conjunto para esta pieza
        let regions = self.topology.get_cell_regions(cell);
        let new_set_idx = self.sets.len();
        self.sets.push(DisjointSet {
            parent: new_set_idx,
            regions_touched: regions,
        });
        self.cell_set_map[cell] = Some(new_set_idx);

        // 3. Conectar con vecinos del mismo jugador
        // Clonamos los vecinos para evitar problemas de préstamo (borrow checker)
        let neighbors = self.topology.get_neighbors(cell).to_vec();
        let mut won = false;

        for neighbor in neighbors {
            if let Some(p) = self.state[neighbor] {
                if p == player {
                    let neighbor_set_idx = self.cell_set_map[neighbor].unwrap();
                    // Unir conjuntos y verificar si ganamos
                    if self.union(new_set_idx, neighbor_set_idx) {
                        won = true;
                    }
                }
            }
        }

        // Caso especial: Una sola pieza conecta todo (ej: tablero minúsculo)
        if !won {
             let root = self.find(new_set_idx);
             if (self.sets[root].regions_touched & self.topology.winning_mask()) == self.topology.winning_mask() {
                 won = true;
             }
        }

        Ok(won)
    }

    /// Encuentra el representante (raíz) del conjunto al que pertenece i (con compresión de ruta).
    fn find(&mut self, i: usize) -> usize {
        if self.sets[i].parent == i {
            i
        } else {
            let parent = self.sets[i].parent;
            let root = self.find(parent);
            self.sets[i].parent = root;
            root
        }
    }

    /// Une dos conjuntos y actualiza las regiones tocadas.
    /// Devuelve true si la unión resulta en una condición de victoria.
    fn union(&mut self, i: usize, j: usize) -> bool {
        let root_i = self.find(i);
        let root_j = self.find(j);

        if root_i != root_j {
            // Unir J en I
            self.sets[root_j].parent = root_i;
            // Combinar las regiones tocadas (OR bit a bit)
            self.sets[root_i].regions_touched |= self.sets[root_j].regions_touched;
        }

        // Verificar victoria
        let target = self.topology.winning_mask();
        (self.sets[root_i].regions_touched & target) == target
    }
}
