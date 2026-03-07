interface GameYData {
  size: number;
  turn: number;
  players: string[];
  layout: string;
}

interface GameScreenProps {
  username: string;
  difficultyChoice: 'facil' | 'medio' | 'dificil' | null;
  selectedBoardDimension: number | null;
  boardData: GameYData | null;
  winner: number | null;
  connectionStatus: string;
  sizeLabel: string | null;
  onCellClick: (index: number) => void; // Envia un movimiento al backend
  onEndGame: () => void; // Termina la partida actual
  onResetGame: () => void; // Reinicia partida
  onExit: () => void; // Sale del juego y vuelve a home
  onChangeDifficulty: () => void; // Permite cambiar la dificultad durante la partida
  onChangeSize: () => void; // Permite cambiar el tamaño durante la partida
  onFetchHistory: () => void; // Permite consultar el historial de partidas
}

function GameScreen({
  username,
  difficultyChoice,
  selectedBoardDimension,
  boardData,
  winner,
  sizeLabel,
  onCellClick,
  onEndGame,
  onResetGame,
  onExit,
  onChangeDifficulty,
  onChangeSize,
  onFetchHistory
}: GameScreenProps) {

  const botName =
    difficultyChoice === 'facil' ? 'Bot Player (fácil)' :
    difficultyChoice === 'medio' ? 'Bot Player (medio)' :
    difficultyChoice === 'dificil' ? 'Bot Player (difícil)' : 'Bot Player';

  const boardDimension = boardData?.size ?? selectedBoardDimension ?? 6;

  const rawLayout = boardData?.layout ?? '';
  const expectedTotalCells = (boardDimension * (boardDimension + 1)) / 2;
  const flatCells = rawLayout.replaceAll('/', '');
  const normalizedFlatCells = flatCells.padEnd(expectedTotalCells, '.').slice(0, expectedTotalCells);
  const hasRealCellAtIndex = (index: number) => index < expectedTotalCells;
  const rowStartIndex = (rowIndex: number) => (rowIndex * (rowIndex + 1)) / 2;
  const rawRows = rawLayout ? rawLayout.split('/') : [];
  const rows =
    // Usa filas del backend si vienen en formato YEN; si no, las reconstruye desde el layout plano.
    rawRows.length === boardDimension
      ? rawRows.map((row, rowIndex) => {
          const expectedLength = rowIndex + 1;
          return row.padEnd(expectedLength, '.').slice(0, expectedLength);
        })
      : Array.from({ length: boardDimension }, (_, rowIndex) => {
          const start = (rowIndex * (rowIndex + 1)) / 2;
          const end = start + rowIndex + 1;
          return normalizedFlatCells.slice(start, end);
        });

  return (
    <div className="game-screen">

      {/* Barra de navegación superior */}

      <nav className="game-navbar">
        <div className="nav-user-info">
          <h2>Jugador: <span>{username}</span></h2>
        </div>

        <div className="nav-game-settings">
          <button className="nav-btn" onClick={onFetchHistory}>
            Historial
          </button>
          <button className="nav-btn" onClick={onChangeDifficulty}>
            Dificultad: {difficultyChoice || '...'}
          </button>
          <button className="nav-btn" onClick={onChangeSize}>
            {sizeLabel || 'Tamaño...'}
          </button>
          <button className="nav-btn" onClick={onResetGame}>
            Reiniciar Partida
          </button>
          <button className="nav-btn danger" onClick={onEndGame}>
            Rendirse
          </button>
          <button className="nav-btn danger" onClick={onExit}>
            Salir
          </button>
        </div>

      </nav>

      {/* Contenedor principal del tablero y controles */}

      <h2 className="game-title">Partida personalizada contra un bot</h2>

        <div className="game-main-content">
          <div className="board-area">
            <div className="player-slot player-slot-left" aria-label="Jugador humano">
              <p className="player-label player-label-blue">Jugador: {username}</p>
            </div>

            <div className={`board-container board-size-${boardDimension}`}>
              {boardData ? (
                rows.map((row, rowIndex) => (
                  <div key={rowIndex} className="board-row">
                  {row.split('').map((cell, cellIndex) => {
                      // Índice lineal triangular que espera el backend para /move.
                      const currentIndex = rowStartIndex(rowIndex) + cellIndex;
                      const isRealCell = hasRealCellAtIndex(currentIndex);
                      return (
                        <button
                          key={cellIndex}
                          type="button"
                          className={`cell ${cell === 'B' ? 'blue' : cell === 'R' ? 'red' : 'empty'}`}
                          onClick={() =>
                            isRealCell && cell === '.' && winner === null && onCellClick(currentIndex)
                          } // Solo permite celdas vacias
                          disabled={!isRealCell || cell !== '.' || winner !== null} // Bloquea celdas virtuales, ocupadas o partida terminada
                          aria-label={`Celda ${currentIndex}, ${cell === 'B' ? 'ocupada por azul' : cell === 'R' ? 'ocupada por rojo' : 'vacia'}`}
                        >
                          {cell !== '.' ? cell : ''}
                        </button>
                      );
                    })}
                  </div>
                ))
              ) : (
                // Mensaje mostrado si todavia no llego tablero desde /reset
                <p>Carga el tablero para comenzar</p>
              )}
            </div>

            <div className="player-slot player-slot-right" aria-label="Jugador bot">
              <p className="player-label player-label-red">{botName}</p>
            </div>
          </div>

        </div>


    </div>


  );
}

export default GameScreen;
