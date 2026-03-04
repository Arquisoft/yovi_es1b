interface GameYData {
  size: number;
  turn: number;
  players: string[];
  layout: string;
}

interface GameScreenProps {
  username: string;
  boardData: GameYData | null;
  winner: number | null;
  connectionStatus: string;
  difficulty: string | null;
  sizeLabel: string | null;
  onCellClick: (index: number) => void; // Envia un movimiento al backend
  onExit: () => void; // Sale del juego y vuelve a home
  onChangeDifficulty: () => void; // Permite cambiar la dificultad durante la partida
  onChangeSize: () => void; // Permite cambiar el tamaño durante la partida
}

function GameScreen({
  username,
  boardData,
  winner,
  difficulty,
  sizeLabel,
  onCellClick,
  onExit,
  onChangeDifficulty,
  onChangeSize
}: GameScreenProps) {
  return (
    <div className="game-screen">

      {/* Barra de navegación superior */}

      <nav className="game-navbar">
        <div className="nav-user-info">
          <h2>Jugador: <span>{username}</span></h2>
        </div>

        <div className="nav-game-settings">
          <button className="nav-btn" onClick={onChangeDifficulty}>
            Dificultad: {difficulty || '...'}
          </button>
          <button className="nav-btn" onClick={onChangeSize}>
            {sizeLabel || 'Tamaño...'}
          </button>
          <button className="nav-btn danger" onClick={onExit}>
            Salir
          </button>
        </div>

      </nav>

      {/* Contenedor principal del tablero y controles */}
      <div className="board-container">
        {boardData ? (
          (() => {
            let globalIndex = 0;
            // Convierte el layout "fila/fila/fila" a una rejilla de botones
            return boardData.layout.split('/').map((row, rowIndex) => (
              <div key={rowIndex} className="board-row">
                {row.split('').map((cell, cellIndex) => {
                  const currentIndex = globalIndex++;
                  return (
                    <button
                      key={cellIndex}
                      type="button"
                      className={`cell ${cell === 'B' ? 'blue' : cell === 'R' ? 'red' : 'empty'}`}
                      onClick={() => cell === '.' && winner === null && onCellClick(currentIndex)} // Solo permite celdas vacias
                      disabled={cell !== '.' || winner !== null} // Bloquea celdas ocupadas o partida terminada
                      aria-label={`Celda ${currentIndex}, ${cell === 'B' ? 'ocupada por azul' : cell === 'R' ? 'ocupada por rojo' : 'vacia'}`}
                    >
                      {cell !== '.' ? cell : ''}
                    </button>
                  );
                })}
              </div>
            ));
          })()
        ) : (
          // Mensaje mostrado si todavia no llego tablero desde /reset
          <p>Carga el tablero para comenzar</p>
        )}
      </div>

    </div>
  );
}

export default GameScreen;
