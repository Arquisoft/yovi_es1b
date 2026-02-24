//! Implementación de Topología Triangular.
//!
//! Traduce la geometría de coordenadas (x, y, z) a un grafo de celdas conectadas.

use crate::Coordinates;
use super::{BoardTopology, CellIndex, RegionMask};

/// Topología para un tablero triangular regular.
#[derive(Clone, Debug)]
pub struct TriangularTopology {
    pub size: u32,
    /// Lista de adyacencia pre-calculada: adjacency[cell] = [vecino1, vecino2, ...]
    adjacency: Vec<Vec<CellIndex>>,
    /// Regiones pre-calculadas para cada celda
    regions: Vec<RegionMask>,
}

impl TriangularTopology {
    // Definición de bits para los lados del triángulo
    const SIDE_A: u32 = 1 << 0; // x=0
    const SIDE_B: u32 = 1 << 1; // y=0
    const SIDE_C: u32 = 1 << 2; // z=0

    /// Crea una nueva topología triangular del tamaño dado.
    /// Pre-calcula todos los vecinos y regiones para un acceso O(1) durante el juego.
    pub fn new(size: u32) -> Self {
        let total_cells = (size * (size + 1)) / 2;
        let mut adjacency = vec![Vec::new(); total_cells as usize];
        let mut regions = vec![0; total_cells as usize];

        // Pre-calcular vecinos y regiones para cada celda
        for idx in 0..total_cells {
            let coords = Coordinates::from_index(idx, size);

            // 1. Calcular Regiones (Lados que toca)
            let mut mask = 0;
            if coords.touches_side_a() { mask |= Self::SIDE_A; }
            if coords.touches_side_b() { mask |= Self::SIDE_B; }
            if coords.touches_side_c() { mask |= Self::SIDE_C; }
            regions[idx as usize] = mask;

            // 2. Calcular Vecinos usando lógica de coordenadas
            let mut neighbors = Vec::new();
            let x = coords.x();
            let y = coords.y();
            let z = coords.z();

            if x > 0 {
                neighbors.push(Coordinates::new(x - 1, y + 1, z));
                neighbors.push(Coordinates::new(x - 1, y, z + 1));
            }
            if y > 0 {
                neighbors.push(Coordinates::new(x + 1, y - 1, z));
                neighbors.push(Coordinates::new(x, y - 1, z + 1));
            }
            if z > 0 {
                neighbors.push(Coordinates::new(x + 1, y, z - 1));
                neighbors.push(Coordinates::new(x, y + 1, z - 1));
            }

            // Convertir coordenadas de vecinos a índices y guardar
            for n_coord in neighbors {
                adjacency[idx as usize].push(n_coord.to_index(size) as usize);
            }
        }

        Self {
            size,
            adjacency,
            regions,
        }
    }
}

impl BoardTopology for TriangularTopology {
    fn total_cells(&self) -> usize {
        ((self.size * (self.size + 1)) / 2) as usize
    }

    fn get_neighbors(&self, cell: CellIndex) -> &[CellIndex] {
        &self.adjacency[cell]
    }

    fn get_cell_regions(&self, cell: CellIndex) -> RegionMask {
        self.regions[cell]
    }

    fn winning_mask(&self) -> RegionMask {
        // Para ganar en Y, necesitas tocar los 3 lados
        Self::SIDE_A | Self::SIDE_B | Self::SIDE_C
    }
}
