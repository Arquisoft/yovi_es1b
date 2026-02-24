import reactLogo from '../assets/react.svg';

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
  onCellClick: (index: number) => void; // Envia un movimiento al backend
  onExit: () => void; // Sale del juego y vuelve a home
}

function GameScreen({
  username,
  boardData,
  winner,
  connectionStatus,
  onCellClick,
  onExit,
}: GameScreenProps) {
  return (
    <div className="game-screen">
      <a href="https://vitejs.dev" target="_blank" rel="noreferrer">
        <img src="/vite.svg" className="logo" alt="Vite logo" />
      </a>
      <a href="https://react.dev" target="_blank" rel="noreferrer">
        <img src={reactLogo} className="logo react" alt="React logo" />
      </a>

      <h2>Jugador: {username}</h2>

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

      <div className="game-controls">
        <p className="status-text">{connectionStatus}</p>
        <button className="exit-button" onClick={onExit}>
          Salir
        </button>
      </div>
    </div>
  );
}

export default GameScreen;
