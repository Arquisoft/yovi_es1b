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
  turnTimeLeft: number | null;
  turnTimeLimit: number | null;
  timerVisible: boolean;
  sizeLabel: string | null;
  onCellClick: (index: number) => void; // Envia un movimiento al backend
  onEndGame: () => void; // Termina la partida actual
  onResetGame: () => void; // Reinicia partida
  onExit: () => void; // Sale del juego y vuelve a home
  onChangeDifficulty: () => void; // Permite cambiar la dificultad durante la partida
  onChangeSize: () => void; // Permite cambiar el tamaño durante la partida
  onFetchHistory: () => void; // Permite consultar el historial de partidas
  onAddFriend: () => void; // Permite agregar un amigo
}

function GameScreen({
  username,
  difficultyChoice,
  selectedBoardDimension,
  boardData,
  winner,
  connectionStatus,
  turnTimeLeft,
  turnTimeLimit,
  timerVisible,
  sizeLabel,
  onCellClick,
  onEndGame,
  onResetGame,
  onExit,
  onChangeDifficulty,
  onChangeSize,
  onFetchHistory,
  onAddFriend,
}: GameScreenProps) {

  // Lógica de nombres de bots
  let botName = 'Bot Player';
  if (difficultyChoice === 'facil') botName = 'Bot Player (fácil)';
  else if (difficultyChoice === 'medio') botName = 'Bot Player (medio)';
  else if (difficultyChoice === 'dificil') botName = 'Bot Player (difícil)';

  // Lógica de construcción del tablero (Triangular)
  const boardDimension = boardData?.size ?? selectedBoardDimension ?? 6;
  const rawLayout = boardData?.layout ?? '';
  const expectedTotalCells = (boardDimension * (boardDimension + 1)) / 2;
  const flatCells = rawLayout.replaceAll('/', '').padEnd(expectedTotalCells, '.').slice(0, expectedTotalCells);
  
  const rowStartIndex = (rowIndex: number) => (rowIndex * (rowIndex + 1)) / 2;
  
  const rows = Array.from({ length: boardDimension }, (_, rowIndex) => {
    const start = rowStartIndex(rowIndex);
    const end = start + rowIndex + 1;
    return flatCells.slice(start, end);
  });

  return (
    <div className="game-screen">
      <nav className="game-navbar">
        <div className="nav-user-info">
          <h2>Jugador: <span>{username}</span></h2>
          {/* Mostramos el estado de la conexión/movimiento */}
          <small className="status-indicator">{connectionStatus}</small>
        </div>

        <div className="nav-game-settings">
          <button className="nav-btn" onClick={onFetchHistory}>Historial</button>
          <button className="nav-btn" onClick={onChangeDifficulty}>
            Dificultad: {difficultyChoice || '...'}
          </button>
          <button className="nav-btn" onClick={onChangeSize}>
            {sizeLabel || 'Tamaño...'}
          </button>
          <button className="nav-btn" onClick={onResetGame}>Reiniciar</button>
          <button className="nav-btn danger" onClick={onEndGame}>Rendirse</button>
          <button className="nav-btn danger" onClick={onExit}>Salir</button>
          <button className="nav-btn" onClick={onAddFriend}>Amigos</button>
        </div>
      </nav>

      <h2 className="game-title">Partida personalizada contra un bot</h2>

      <div className="game-main-content">
        <div className="board-area">
          <div className="player-slot player-slot-left">
            <p className="player-label player-label-blue">Tú: {username}</p>
          </div>

          {/* Temporizador */}
          {timerVisible && turnTimeLimit !== null && winner === null && (
            <div className="turn-timer">
              <div className="turn-timer-header">
                <span className="turn-timer-label">Tu turno</span>
                <span className={`turn-timer-seconds ${(turnTimeLeft ?? 0) <= 5 ? 'turn-timer-urgent' : ''}`}>
                  {turnTimeLeft ?? 0}s
                </span>
              </div>
              <div className="turn-timer-bar-bg">
                <div 
                  className={`turn-timer-bar ${(turnTimeLeft ?? 0) <= 5 ? 'turn-timer-bar-urgent' : ''}`}
                  style={{ width: `${((turnTimeLeft ?? 0) / turnTimeLimit) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className={`board-container board-size-${boardDimension}`}>
            {boardData ? (
              rows.map((row, rowIndex) => (
                <div key={rowIndex} className="board-row">
                  {row.split('').map((cell, cellIndex) => {
                    const currentIndex = rowStartIndex(rowIndex) + cellIndex;
                    return (
                      <button
                        key={cellIndex}
                        type="button"
                        className={`cell ${cell === 'B' ? 'blue' : cell === 'R' ? 'red' : 'empty'}`}
                        onClick={() => cell === '.' && winner === null && onCellClick(currentIndex)}
                        disabled={cell !== '.' || winner !== null}
                        aria-label={`Celda ${currentIndex}`}
                      >
                        {cell !== '.' ? cell : ''}
                      </button>
                    );
                  })}
                </div>
              ))
            ) : (
              <p>Cargando tablero...</p>
            )}
          </div>

          <div className="player-slot player-slot-right">
            <p className="player-label player-label-red">{botName}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameScreen;
