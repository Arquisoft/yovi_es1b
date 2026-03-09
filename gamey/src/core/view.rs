use crate::{Coordinates, PlayerId, RenderOptions};
use std::fmt::Write;

/// Renders a triangular board state into a string.
pub fn render_triangular_board(
    board_size: u32,
    state: &[Option<PlayerId>],
    options: &RenderOptions,
) -> String {
    let mut result = String::new();
    let coords_size = board_size.to_string().len();
    let _ = writeln!(result, "--- Game of Y (Size {}) ---", board_size);

    let indent_multiplier = get_indent_multiplier(options);

    for row in 0..board_size {
        let x = board_size - 1 - row;
        indent(&mut result, x * indent_multiplier);

        for y in 0..=row {
            let z = row - y;
            let coords = Coordinates::new(x, y, z);
            let idx = coords.to_index(board_size) as usize;

            // Safe access to state
            let player = if idx < state.len() { state[idx] } else { None };

            let cell_str = format_cell(coords, player, options, coords_size, board_size);
            let _ = write!(result, "{}   ", cell_str);
        }

        result.push('\n');
        if options.show_idx || options.show_3d_coords {
            result.push('\n');
        }
    }
    result
}

fn get_indent_multiplier(options: &RenderOptions) -> u32 {
    match (options.show_3d_coords, options.show_idx) {
        (true, true) => 8,
        (true, false) => 4,
        (false, true) => 4,
        (false, false) => 2,
    }
}

fn format_cell(
    coords: Coordinates,
    player: Option<PlayerId>,
    options: &RenderOptions,
    width: usize,
    board_size: u32,
) -> String {
    // 1. Base symbol
    let mut symbol = match player {
        Some(p) => format!("{}", p),
        None => ".".to_string(),
    };

    // 2. Append metadata (3D Coords / Index)
    if options.show_3d_coords {
        symbol.push_str(&format!(
            "({:0w$},{:0w$},{:0w$})",
            coords.x(),
            coords.y(),
            coords.z(),
            w = width
        ));
    }
    if options.show_idx {
        let idx = coords.to_index(board_size);
        symbol.push_str(&format!("({}) ", idx));
    }

    // 3. Apply colors
    if options.show_colors {
        symbol = apply_player_color(symbol, player);
    }

    symbol
}

fn indent(str: &mut String, level: u32) {
    str.push_str(&" ".repeat(level as usize));
}

fn apply_player_color(symbol: String, player: Option<PlayerId>) -> String {
    match player {
        Some(p) if p.id() == 0 => format!("\x1b[34m{}\x1b[0m", symbol), // Blue
        Some(p) if p.id() == 1 => format!("\x1b[31m{}\x1b[0m", symbol), // Red
        _ => symbol,
    }
}
