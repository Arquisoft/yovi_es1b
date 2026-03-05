use gamey::core::view::render_triangular_board;
use gamey::{Coordinates, PlayerId, RenderOptions};



#[test]
fn test_render_with_pieces() {
    let size = 3;
    let total_cells = (size * (size + 1)) / 2;
    let mut state = vec![None; total_cells as usize];

    // Place some pieces manually
    // (2, 0, 0) -> Index 0 (Top left of row 0)
    let idx1 = Coordinates::new(2, 0, 0).to_index(size) as usize;
    state[idx1] = Some(PlayerId::new(0));

    // (1, 1, 0) -> Index 4 (Middle of row 1)
    let idx2 = Coordinates::new(1, 1, 0).to_index(size) as usize;
    state[idx2] = Some(PlayerId::new(1));

    let options = RenderOptions::default();
    let output = render_triangular_board(size, &state, &options);

    assert!(output.contains("0"));
    assert!(output.contains("1"));
}

#[test]
fn test_render_show_indices() {
    let size = 2;
    let total_cells = (size * (size + 1)) / 2;
    let state = vec![None; total_cells as usize];
    let options = RenderOptions {
        show_idx: true,
        ..RenderOptions::default()
    };

    let output = render_triangular_board(size, &state, &options);

    // Should contain indices (0), (1), (2)
    assert!(output.contains("(0)"));
    assert!(output.contains("(1)"));
    assert!(output.contains("(2)"));
}

#[test]
fn test_render_show_3d_coords() {
    let size = 2;
    let total_cells = (size * (size + 1)) / 2;
    let state = vec![None; total_cells as usize];
    let options = RenderOptions {
        show_3d_coords: true,
        ..RenderOptions::default()
    };

    let output = render_triangular_board(size, &state, &options);

    // Should contain coords like (1,0,0)
    assert!(output.contains("(1,0,0)"));
    assert!(output.contains("(0,1,0)"));
    assert!(output.contains("(0,0,1)"));
}

#[test]
fn test_render_size_1() {
    let size = 1;
    let state = vec![None];
    let options = RenderOptions::default();

    let output = render_triangular_board(size, &state, &options);

    assert!(output.contains("--- Game of Y (Size 1) ---"));
    assert!(output.contains("."));
}

#[test]
fn test_render_colors() {
    let size = 1;
    let state = vec![Some(PlayerId::new(0))];
    let options = RenderOptions {
        show_colors: true,
        ..RenderOptions::default()
    };

    let output = render_triangular_board(size, &state, &options);

    // Check for ANSI color code for blue (Player 0)
    assert!(output.contains("\x1b[34m"));
}
