import { useEffect, useState } from 'react'

// Estilos y assets
import './css/App.css'
import './css/Log.css'
import './css/Game.css'
import menuVideo from './assets/background_video.mp4';

// Pantallas
import HomeScreen from './screens/HomeScreen';
import RegisterScreen from './screens/RegisterScreen';
import LoginScreen from './screens/LoginScreen';
import GameScreen from './screens/GameScreen';

// URL del backend (se inyecta desde docker-compose o se usa localhost por defecto)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Definición de tipos
interface GameYData {
  size: number;
  turn: number;
  players: string[];
  layout: string;
}

type Screen = 'home' | 'register' | 'login' | 'game';
type DifficultyChoice = string; // Ahora es string dinámico
type SizeChoice = 'Tamaño 6x6x6' | 'Tamaño 9x9x9' | 'Tamaño 12x12x12';


// Funciones de utilidad

/**
 * Convierte el texto del boton en un numero
 * Ej: "Tamaño 6x6x6" => 6
 */
const getBoardDimensionFromSizeChoice = (choice: SizeChoice | null): number | null => {
  if (!choice) return null;
  if (choice.includes('6x6x6')) return 6;
  if (choice.includes('9x9x9')) return 9;
  if (choice.includes('12x12x12')) return 12;
  return null;
};

/**
 * Dibuja una ficha en el string del tablero.
 * El tablero viene de rust como una linea de texto. Esta función busca el indice 
 * que se ha pulsado y pone una 'B' azul para mostrar el movimiento.
 * @param layout 
 * @param size 
 * @param index 
 * @param value 
 * @returns 
 */
const patchTriangularLayoutCell = (
  layout: string,
  size: number,
  index: number,
  value: 'B' | 'R'
): string => {
  if (!Number.isFinite(size) || size <= 0) return layout;
  const totalCells = (size * (size + 1)) / 2;
  if (index < 0 || index >= totalCells) return layout;

  const flat = layout.replaceAll('/', '').padEnd(totalCells, '.').slice(0, totalCells).split('');
  flat[index] = value;

  const rows: string[] = [];
  let cursor = 0;
  // Reconstruye el layout con filas triangulares: 1,2,3...N celdas.
  for (let rowLen = 1; rowLen <= size; rowLen += 1) {
    rows.push(flat.slice(cursor, cursor + rowLen).join(''));
    cursor += rowLen;
  }
  return rows.join('/');
};



function App() {
  // Estados (la memoria de App)
  const [connectionStatus, setConnectionStatus] = useState('Without connection');
  const [username, setUsername] = useState('');
  const [currentScreen, setCurrentScreen] = useState<Screen>('home'); // Router interno de pantallas
  const [boardData, setBoardData] = useState<GameYData | null>(null);
  const [winner, setWinner] = useState<number | null>(null);
  const [difficultyChoice, setDifficultyChoice] = useState<DifficultyChoice | null>(null);
  const [sizeChoice, setSizeChoice] = useState<SizeChoice | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [availableDifficulties, setAvailableDifficulties] = useState<string[]>([]);
  // Para consultar el historial
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState([]);

  // Efecto para que la pantalla siempre empiece arriba al cambiar de menu
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [currentScreen]);

  useEffect(() => {
    // Cargar dificultades disponibles al iniciar
    fetch('http://localhost:3000/difficulties')
      .then(res => res.json())
      .then(data => setAvailableDifficulties(data))
      .catch(err => console.error('Error fetching difficulties:', err));
  }, []);

  const requestResetBoard = async (dimension: number | null, difficulty?: string): Promise<GameYData | null> => {
    const response = await fetch('http://localhost:3000/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ size: dimension, difficulty: difficulty }),
    });

    if (!response.ok) {
      throw new Error(`Reset failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.responseFromRust ?? data.board ?? data;
  };

  // Helper para reiniciar el estado del juego (UI) cuando se recibe un nuevo tablero
  const resetGameState = (board: GameYData | null, message: string) => {
    if (board) {
        setBoardData(board);
        setWinner(null);
        setShowResultModal(false);
        setConnectionStatus(message);
    }
  };

  /**
   * Configura todo para empezar a jugar.
   * Se establece por defecto:
   * - dificultad fácil
   * - tamaño 6x6x6
   * @param playerName 
   * @param options 
   */
  const startGameWithUser = async (
    playerName: string,
    options?: { dimension?: number | null; resetChoices?: boolean }
  ) => {
    // Permite iniciar partida forzando tamaño (desde Game) o limpiando selecciones (desde Home/Login).
    const requestedDimension = options?.dimension ?? null;
    const shouldResetChoices = options?.resetChoices ?? true;

    if (playerName.trim() !== '') {
      setUsername(playerName.trim());
      setConnectionStatus('Iniciando nueva partida predeterminada...');

      try {
        let targetDifficulty = difficultyChoice;

        const board = await requestResetBoard(requestedDimension ?? 6);
        // SOLO reseteamos a "Fácil/5x5" si venimos desde el Login o Inicio
        // Si venimos del menú de "Cambiar Tamaño", mantenemos lo que había
        // Si venimos de Login/Home (shouldResetChoices=true), forzamos "Easy" por defecto
        if (shouldResetChoices) {
          targetDifficulty = 'Easy';
          setDifficultyChoice(targetDifficulty);
          setSizeChoice('Tamaño 6x6x6');
        }

        // Aseguramos que haya una dificultad seleccionada (fallback a Easy)
        const finalDiff = targetDifficulty || 'Easy';

        const board = await requestResetBoard(requestedDimension ?? 6, finalDiff);
        setBoardData(board);

        setShowResultModal(false);
        setWinner(null);
        setCurrentScreen('game');
        setConnectionStatus('¡Partida lista!');
      } catch (error) {
        console.error('Error starting the game:', error);
        setConnectionStatus('Error al conectar con el servidor.');
      }
    }
  };

  const handleStart = async () => {
    await startGameWithUser(username);
  };

  /**
   * Corazon del juego. 
   * Cuando el usuario pulsa una celda, se envia al backend para que actualice 
   * el tablero y responda con el nuevo estado de la partida.
   */
  const handleCellClick = async (index: number) => {
    if (winner !== null) return;

    setConnectionStatus(`Moviendo a la posicion ${index}...`);
    try {
      // Envia el movimiento al backend para actualizar tablero
      const response = await fetch(`${API_BASE_URL}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cellIndex: index, player: username }),
      });

      const data = await response.json();

      if (data.responseFromRust) {
        const serverBoard = data.responseFromRust as GameYData;
        const chosenDimension = getBoardDimensionFromSizeChoice(sizeChoice);
        const boardSize =
          serverBoard?.size && Number.isFinite(serverBoard.size) && serverBoard.size > 0
            ? serverBoard.size
            : (chosenDimension ?? 5);
        const serverFlatLayout = (serverBoard?.layout ?? '').replaceAll('/', '');
        const shouldPatchClickedCell =
          index >= 0 &&
          index < (boardSize * (boardSize + 1)) / 2 &&
          serverFlatLayout[index] === '.';

        setBoardData(
          shouldPatchClickedCell
            ? {
                ...serverBoard,
                size: boardSize,
                layout: patchTriangularLayoutCell(serverBoard.layout ?? '', boardSize, index, 'B'),
              }
            : serverBoard
        );
        setWinner(data.winner);

        if (data.winner !== null) {
          setShowResultModal(true);
          setConnectionStatus(data.winner === 0 ? 'Has ganado!' : 'Ha ganado el bot!');
        } else {
          setConnectionStatus('Movimiento realizado!');
        }
      }
    } catch (error) {
      setConnectionStatus('Error realizando el movimiento');
    }
  }



  const handleResetFromGame = async () => {
    const selectedDimension = getBoardDimensionFromSizeChoice(sizeChoice);
    // Al reiniciar desde el juego, mantenemos la dificultad actual
    if (difficultyChoice) {
        const board = await requestResetBoard(selectedDimension, difficultyChoice);
        resetGameState(board, 'Partida reiniciada');
    } else {
        await startGameWithUser(username, { dimension: selectedDimension, resetChoices: false });
    }
  };

  const handleEndFromGame = () => {
    setWinner(1);
    setShowResultModal(true);
    setConnectionStatus('Has perdido!');
  };

  const handleExitFromGame = () => {
    setShowResultModal(false);
    setCurrentScreen('home');
  };

  /**
   * Logica para cargar el historial desde el servidor
   */
 const fetchHistory = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/history`);
    const data = await response.json();
    setHistoryData(data);
    setShowHistory(true);
  } catch (error) {
    console.error('Error fetching history:', error);
  }
 }


  // Renderizado de pantallas

  //Permite ir cambiando entre pantallas, randerizando la vista
  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        // CASE HOME: pantalla inicial con accesos a registro/login y quick access
        return (
          <HomeScreen
            username={username}
            onUsernameChange={setUsername}
            onStart={handleStart}
            onGoToRegister={() => setCurrentScreen('register')}
            onGoToLogin={() => setCurrentScreen('login')}
          />
        );

      case 'game':
        // CASE GAME: pantalla del tablero y estado de la partida en curso
        return (
          <GameScreen
            username={username}
            difficultyChoice={difficultyChoice as any}
            selectedBoardDimension={getBoardDimensionFromSizeChoice(sizeChoice)}
            boardData={boardData}
            winner={winner}
            connectionStatus={connectionStatus}
            sizeLabel={sizeChoice}
            onCellClick={handleCellClick}
            onExit={handleExitFromGame}
            onChangeDifficulty={() => setDifficultyChoice(null)}
            onChangeSize={() => setSizeChoice(null)}
            onEndGame={handleEndFromGame}
            onResetGame={handleResetFromGame}
            onFetchHistory={fetchHistory}
          />
        );

      case 'register':
        // CASE REGISTER: formulario de registro; si valida, inicia partida y entra a game
        return (
          <RegisterScreen
            onBack={() => setCurrentScreen('home')}
            onCreateAccount={startGameWithUser}
          />
        );

      case 'login':
        // CASE LOGIN: formulario de inicio de sesion; si valida, inicia partida y entra a game
        return (
          <LoginScreen
            onBack={() => setCurrentScreen('home')}
            onLogin={startGameWithUser}
          />
        );

      default:
        // CASE DEFAULT: salvaguarda por si llega un valor de pantalla no contemplado
        return null;
    }
  };

  //Cambia la dificultad según elección
  const handleDifficultyChoice = (choice: DifficultyChoice) => {
    setDifficultyChoice(choice);
    // Actualizar en el backend también si ya estamos en juego
    const selectedDimension = getBoardDimensionFromSizeChoice(sizeChoice);
    requestResetBoard(selectedDimension, choice).then(board => {
        resetGameState(board, `Dificultad cambiada a ${choice}`);
    });
  };

  //Cambia el tamaño de tablero según hemos elegido y deja un mensaje
  const handleSecondaryChoice = (choice: SizeChoice) => {
    setSizeChoice(choice);
    const selectedDimension = getBoardDimensionFromSizeChoice(choice);
    if (selectedDimension === null) return;

    setConnectionStatus(`Cargando tablero ${selectedDimension}x${selectedDimension}...`);
    requestResetBoard(selectedDimension, difficultyChoice || undefined)
      .then((board) => {
        if (board && board.layout) {
          setBoardData(board);
          setWinner(null);
          setConnectionStatus(`Tablero ${selectedDimension}x${selectedDimension} cargado`);
        } else {
          setConnectionStatus('No se recibio un tablero valido para el tamano elegido.');
        }
      })
      .catch(() => {
        setConnectionStatus('No se pudo cambiar el tamano del tablero.');
      });
  };

  const handleCloseResultModal = () => {
    setShowResultModal(false);
  };

  // Cierre de App
  return (
    <div className="App">
      {/* Fondo de video global */}
      <video
        className="menu-video-bg"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      >
        <source src={menuVideo} type="video/mp4" />
      </video>
      <div className="menu-video-overlay" />

      {/* Renderiza la pantalla activa (home/register/login/game) */}
      {renderScreen()}
      {currentScreen === 'game' && difficultyChoice === null && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Seleccion de dificultad obligatoria">
          <div className="modal-box">
            <h3>Con que dificultad quieres jugar?</h3>
            {availableDifficulties.length > 0 ? (
                availableDifficulties.map(diff => (
                    <button key={diff} type="button" className="submit-button" onClick={() => handleDifficultyChoice(diff)}>
                        {diff}
                    </button>
                ))
            ) : (
                <p>Cargando dificultades...</p>
            )}
          </div>
        </div>
      )}

      {currentScreen === 'game' && difficultyChoice !== null && sizeChoice === null && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Seleccion secundaria obligatoria">
          <div className="modal-box">
            <h3>¿Con qué tamaño de tablero deseas jugar?</h3>
            <button type="button" className="submit-button" onClick={() => handleSecondaryChoice('Tamaño 6x6x6')}>
              Tamaño 6x6x6
            </button>
            <button type="button" className="submit-button" onClick={() => handleSecondaryChoice('Tamaño 9x9x9')}>
              Tamaño 9x9x9
            </button>
            <button type="button" className="submit-button" onClick={() => handleSecondaryChoice('Tamaño 12x12x12')}>
              Tamaño 12x12x12
            </button>
          </div>
        </div>
      )}

      {currentScreen === 'game' && winner !== null && showResultModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Resultado de la partida">
          <div className="modal-box">
            <h3>{winner === 0 ? 'Has ganado' : 'Has perdido'}</h3>
            <div className="modal-actions">
              <button type="button" className="submit-button" onClick={handleCloseResultModal}>
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE HISTORIAL: Se activa cuando showHistory es true */}
      {showHistory && (
        <div className="modal-backdrop" onClick={() => setShowHistory(false)}>
          <div className="modal-box history-modal" onClick={(e) => e.stopPropagation()}>

            <h3>Historial de Partidas</h3>
            
            <div className="history-table-container">
              {historyData.length > 0 ? (
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Rival</th>
                      <th>Tamaño</th>
                      <th>Dificultad</th>
                      <th>Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.map((game: any) => (
                      <tr key={game.id}>
                        <td>{new Date(game.date).toLocaleDateString()}</td>
                        <td>{game.opponent}</td>
                        <td>{game.board_size}x{game.board_size}</td>
                        <td>{game.difficulty}</td>
                        <td className={game.result === 'Victoria' ? 'text-win' : 'text-loss'}>
                          {game.result}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{color: '#ccc', padding: '20px'}}>No hay partidas guardadas.</p>
              )}
            </div>

            <button className="submit-button" onClick={() => setShowHistory(false)}>
              Volver al Juego
            </button>
          </div>
        </div>
      )}


    </div>
  );
}

export default App;
