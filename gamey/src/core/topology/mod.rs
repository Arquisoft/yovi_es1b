//! Módulo de Topología del Tablero.
//!
//! Este módulo define la abstracción de un tablero (`BoardTopology`) y proporciona
//! implementaciones concretas (como `TriangularTopology`) y un motor de juego genérico (`GameEngine`).

use crate::Coordinates;

pub mod engine;
pub mod triangular;

pub use engine::*;
pub use triangular::*;

/// Representa un identificador único para una celda en el tablero.
pub type CellIndex = usize;

/// Representa regiones del tablero (ej: Lado A, Lado B, Centro, Base).
/// Usamos una máscara de bits para eficiencia.
pub type RegionMask = u32;

/// El Contrato (Trait): Cualquier forma de tablero debe implementar esto.
pub trait BoardTopology {
    /// Devuelve el número total de celdas en el tablero.
    fn total_cells(&self) -> usize;

    /// Devuelve los índices de los vecinos de una celda dada.
    fn get_neighbors(&self, cell: CellIndex) -> &[CellIndex];

    /// Devuelve las regiones a las que pertenece una celda (ej: Lado A | Lado B).
    fn get_cell_regions(&self, cell: CellIndex) -> RegionMask;

    /// Define la combinación de regiones necesaria para ganar.
    fn winning_mask(&self) -> RegionMask;

    /// Convierte coordenadas específicas de la topología a un índice de celda lineal.
    /// Esto permite desacoplar la lógica del juego de la geometría específica.
    fn coords_to_index(&self, coords: Coordinates) -> CellIndex;

    /// Convierte un índice de celda lineal a coordenadas específicas de la topología.
    fn index_to_coords(&self, index: CellIndex) -> Coordinates;
}
