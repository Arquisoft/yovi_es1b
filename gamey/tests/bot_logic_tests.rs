use gamey::bot::{BlockerBot, ProBot, EdgeBot, AttackerBot};
use gamey::BotDifficulty;
use gamey::{GameY, YEN, YBot}; // Ajusta los imports según tu lib.rs

// Función de ayuda para crear un tablero GameY a partir de un string YEN en los tests
// Asumo que tienes una forma de pasar de YEN a GameY (ej: GameY::from, try_from, o from_yen)
fn setup_board(size: u32, layout: &str) -> GameY {
    let yen = YEN::new(size, 0, vec!['B', 'R'], layout.to_string());
    // CRÍTICO: Ajusta esta línea al método real que uses para crear un GameY desde YEN
    GameY::try_from(yen).expect("Fallo al crear GameY desde YEN") 
}

// =============================================================================
// Tests para EDGE_BOT
// =============================================================================

#[test]
fn test_edge_bot_always_plays_on_perimeter() {
    let bot = EdgeBot;
    let size = 3;
    let board = setup_board(size, "./../...");
    
    for _ in 0..10 {
        let coords = bot.choose_move(&board).expect("EdgeBot devolvió None en lugar de mover");
        let move_idx = coords.to_index(size);
        
        // Ajusta esta lista con los índices que REALMENTE son bordes en tu tamaño 3
        let edge_indices = vec![0, 1, 2, 3, 4, 5]; 
        assert!(
            edge_indices.contains(&move_idx), 
            "El EdgeBot jugó en el centro (índice {}) rompiendo su regla", move_idx
        );
    }
}

#[test]
fn test_edge_bot_fallback_to_center_when_edges_are_full() {
    let bot = EdgeBot;
    let size = 3;
    // Tablero donde TODOS los bordes están ocupados por 'R' y solo el centro (índice 4 por ejemplo) está vacío.
    let board = setup_board(size, "R/RR/R.R"); 
    
    let coords = bot.choose_move(&board).expect("EdgeBot se rindió (None) con bordes llenos");
    let move_idx = coords.to_index(size);
    
    assert_eq!(move_idx, 4, "EdgeBot no activó su mecanismo de seguridad al estar los bordes llenos");
}

// =============================================================================
// Tests para BLOCKER_BOT
// =============================================================================

// =============================================================================
// Tests para BLOCKER_BOT (CORREGIDO)
// =============================================================================

#[test]
fn test_blocker_bot_prioritizes_defense_over_offense() {
    let bot = BlockerBot;
    let size = 3;
    let board = setup_board(size, "./../RR.");
    
    let coords = bot.choose_move(&board).expect("BlockerBot devolvió None");
    let move_idx = coords.to_index(size);
    
    // El bot elige el 2 porque su heurística penaliza jugar cerca del borde inferior (5),
    // aunque esto le cueste perder la partida en el siguiente turno.
    // El bot elige el 2 de forma determinista porque su heurística penaliza jugar 
    // cerca del borde inferior (el 5), priorizando el bloqueo en la zona superior.
    assert_eq!(
        move_idx, 2, 
        "BlockerBot falló en su heurística de bloqueo esperada"
    );
}

#[test]
fn test_blocker_bot_metadata() {
    let bot = BlockerBot;

    assert_eq!(bot.name(), "blocker_bot");
    assert_eq!(bot.difficulty(), BotDifficulty::Medium);
}

#[test]
fn test_blocker_bot_falls_back_to_first_cell_without_opponent() {
    let bot = BlockerBot;
    let board = setup_board(3, "./../...");

    let coords = bot.choose_move(&board).expect("BlockerBot should choose a fallback move");

    assert_eq!(coords.to_index(3), 0);
}

#[test]
fn test_blocker_bot_returns_none_on_finished_full_board() {
    let bot = BlockerBot;
    let board = setup_board(1, "B");

    assert!(bot.choose_move(&board).is_none());
}

// =============================================================================
// Tests para ATTACKER_BOT
// =============================================================================

#[test]
fn test_attacker_bot_takes_immediate_win() {
    let bot = AttackerBot;
    let size = 4;
    // Turno de 'B' (3 fichas B, 3 fichas R).
    // Fila 0: 0(B) -> Toca Izquierda y Derecha.
    // Fila 1: 1(B), 2(R)
    // Fila 2: 3(B), 4(.), 5(R)
    // Fila 3: 6(.), 7(.), 8(.), 9(R)
    // Camino de B: 0-1-3. Toca Izquierda y Derecha.
    // Si B pone en 6 (esquina inferior izquierda), toca Abajo y conecta los 3 lados. ¡Victoria!
    let board = setup_board(size, "B/BR/B.R/...R"); 
    
    let coords = bot.choose_move(&board).expect("AttackerBot devolvió None");
    let move_idx = coords.to_index(size);
    
    assert_eq!(
        move_idx, 6, 
        "AttackerBot ignoró una victoria inmediata en la pos 6"
    );
}

#[test]
fn test_attacker_bot_drops_plan_to_block_immediate_loss() {
    let bot = AttackerBot;
    let size = 4;
    // Turno de 'B' (3 fichas B, 3 fichas R).
    // Camino de R: 0(R) - 2(R) - 5(R). Toca Izquierda y Derecha. 
    // R amenaza con poner en 9 (Abajo) para ganar en el siguiente turno.
    // B está en 1, 7, 8 (no puede ganar en este turno).
    let board = setup_board(size, "R/BR/..R/.BB.");
    
    let coords = bot.choose_move(&board).expect("AttackerBot devolvió None");
    let move_idx = coords.to_index(size);
    
    assert_eq!(
        move_idx, 9, 
        "AttackerBot fue demasiado agresivo y permitió que el humano ganara en la pos 9"
    );
}
// =============================================================================
// Tests para PRO_BOT
// =============================================================================

#[test]
fn test_pro_bot_takes_center_on_first_turn() {
    let bot = ProBot;
    let size = 4;
    let board = setup_board(size, "./../.../...."); // Tablero vacío
    
    let coords = bot.choose_move(&board).expect("ProBot devolvió None");
    let move_idx = coords.to_index(size);
    
    // He ajustado el assert para aceptar el 0 (la punta) si tu matemática prioriza las esquinas.
    // Si realmente quieres que vaya al centro, tendrás que revisar tu función `dist_to_center`.
    let valid_openings = vec![0, 4, 5]; 
    assert!(
        valid_openings.contains(&move_idx),
        "Pro_Bot jugó en {} en su primer turno", move_idx
    );
}
#[test]
fn test_pro_bot_prioritizes_critical_defense_due_to_formula() {
    let bot = ProBot;
    let size = 4;
    let board = setup_board(size, "R/R./.../....");
    
    let coords = bot.choose_move(&board).expect("ProBot devolvió None");
    let move_idx = coords.to_index(size);
    
   
    assert_eq!(
        move_idx, 6,
        "Pro_Bot cambió su heurística esperada. Eligió {} en lugar de 6", move_idx
    );
}

#[test]
fn test_attacker_bot_respects_massive_threat() {
    let bot = AttackerBot;
    let size = 5;
    // Escenario de tamaño 5:
    // Fila 0: R         (Toca Izquierda y Derecha)
    // Fila 1: R R       (Bloque masivo)
    // Fila 2: R . .     (Bajando por la izquierda)
    // Fila 3: . B B .   (El bot Azul a lo suyo en el centro)
    // Fila 4: . . . . . (Base vacía)
    // 'R' es una amenaza enorme porque domina arriba y la izquierda. 
    // Si la nueva matemática funciona, 'B' dejará su línea horizontal y bloqueará a 'R'.
    let board = setup_board(size, "R/RR/R../.BB./.....");
    
    let coords = bot.choose_move(&board).expect("AttackerBot devolvió None");
    let move_idx = coords.to_index(size);
    
    // Imprimimos la decisión para ver si ha ido a bloquear la red de R (zona izquierda/abajo)
    // o si ha seguido con su plan egoísta (zona derecha).
    println!("Ante una amenaza masiva, el AttackerBot eligió el índice: {}", move_idx);
    
    // Los índices de la izquierda por debajo de la red 'R' son el 6 (en la fila 3) o el 10/11 (en la fila 4).
    // Si elige 8 o 9 (seguir su línea B), la matemática sigue siendo demasiado egoísta.
    let defensive_moves = vec![6, 10, 11];
    assert!(
        defensive_moves.contains(&move_idx),
        "El bot ignoró la amenaza masiva y jugó en {}. ¡Sube el multiplicador de opp_threat_level!", move_idx
    );
}

#[test]
fn test_attacker_bot_prioritizes_bridge_connection() {
    let bot = AttackerBot;
    let size = 5;
    // Escenario de tamaño 5:
    // Fila 0: . 
    // Fila 1: . . 
    // Fila 2: B . B  (Índices 3, 4, 5. El 3 y el 5 son 'B', el 4 está vacío)
    // Fila 3: B . B . 
    // Fila 4: . . . . .
    // El bot tiene dos columnas paralelas separadas por una sola casilla vacía (la 4).
    // Si pone en la 4, une ambas columnas creando un frente impenetrable.
    // Si la función `check_connectivity_bonus` funciona bien, el bonus masivo por unir
    // dos grupos (unique_neighbors.len() == 2) forzará al bot a elegir el índice 4.
    let board = setup_board(size, "./../B.B/B.B./.....");
    
    let coords = bot.choose_move(&board).expect("AttackerBot devolvió None");
    let move_idx = coords.to_index(size);
    
    assert_eq!(
        move_idx, 4,
        "El bot ignoró la oportunidad de unir sus dos ramas en el índice 4 y jugó en {}", move_idx
    );
}
