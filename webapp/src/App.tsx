import { useEffect, useState } from 'react'

import './css/App.css'
import './css/Log.css'
import './css/Game.css'

import menuVideo from './assets/background_video.mp4';
import HomeScreen from './screens/HomeScreen';
import RegisterScreen from './screens/RegisterScreen';
import LoginScreen from './screens/LoginScreen';
import GameScreen from './screens/GameScreen';

interface GameYData {
  size: number;
  turn: number;
  players: string[];
  layout: string;
}

type Screen = 'home' | 'register' | 'login' | 'game';
type DifficultyChoice = 'facil' | 'medio' | 'dificil';
type SizeChoice = 'Tamaño 6x6x6' | 'Tamaño 9x9x9' | 'Tamaño 12x12x12';

const getBoardDimensionFromSizeChoice = (choice: SizeChoice | null): number | null => {
  if (!choice) return null;
  if (choice.includes('6x6x6')) return 6;
  if (choice.includes('9x9x9')) return 9;
  if (choice.includes('12x12x12')) return 12;
  return null;
};

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
  const [connectionStatus, setConnectionStatus] = useState('Without connection');
  const [username, setUsername] = useState('');
  const [currentScreen, setCurrentScreen] = useState<Screen>('home'); // Router interno de pantallas
  const [boardData, setBoardData] = useState<GameYData | null>(null);
  const [winner, setWinner] = useState<number | null>(null);
  const [difficultyChoice, setDifficultyChoice] = useState<DifficultyChoice | null>(null);
  const [sizeChoice, setSizeChoice] = useState<SizeChoice | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  useEffect(() => {
    // Coloca la vista arriba al cambiar de pantalla
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [currentScreen]);

  const requestResetBoard = async (dimension: number | null): Promise<GameYData | null> => {
    const response = await fetch('http://localhost:3000/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ size: dimension ?? 5 }),
    });

    if (!response.ok) {
      throw new Error(`Reset failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.responseFromRust ?? data.board ?? data;
  };

  const startGameWithUser = async (
    playerName: string,
    options?: { dimension?: number | null; resetChoices?: boolean }
  ) => {
    // Permite iniciar partida forzando tamaño (desde Game) o limpiando selecciones (desde Home/Login).
    const requestedDimension = options?.dimension ?? null;
    const shouldResetChoices = options?.resetChoices ?? true;
    if (playerName.trim() !== '') {
      setUsername(playerName.trim());
      setConnectionStatus('Iniciando nueva partida...');
      try {
        // Solicita tablero inicial al users-service
        const board = await requestResetBoard(requestedDimension);

        if (board && board.layout) {
          // Cada partida nueva desde home/login/register exige volver a elegir opciones
          if (shouldResetChoices) {
            setDifficultyChoice(null);
            setSizeChoice(null);
          }
          setShowResultModal(false);
          setBoardData(board);
          setWinner(null);
          setCurrentScreen('game');
          setConnectionStatus('Partida iniciada!');
        } else {
          setConnectionStatus('No se recibio un tablero valido desde /reset.');
        }
      } catch (error) {
        console.error('Error starting the game:', error);
        setWinner(null);
        setConnectionStatus('No se pudo iniciar la partida. Revisa que users-service este levantado.');
      }
    }
  };

  const handleStart = async () => {
    await startGameWithUser(username);
  };

  //Funcionamiento de celdas y juego
  const handleCellClick = async (index: number) => {
    if (winner !== null) return;

    setConnectionStatus(`Moviendo a la posicion ${index}...`);
    try {
      // Envia el movimiento al backend para actualizar tablero
      const response = await fetch('http://localhost:3000/move', {
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


  const handleStartFromGame = () => {
    setShowResultModal(false);
    setWinner(null);
    setDifficultyChoice(null);
    setSizeChoice(null);
    setConnectionStatus('Selecciona dificultad y tamano para una nueva partida.');
  };

  const handleResetFromGame = async () => {
    const selectedDimension = getBoardDimensionFromSizeChoice(sizeChoice);
    await startGameWithUser(username, { dimension: selectedDimension, resetChoices: false });
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
            difficultyChoice={difficultyChoice}
            selectedBoardDimension={getBoardDimensionFromSizeChoice(sizeChoice)}
            boardData={boardData}
            winner={winner}
            connectionStatus={connectionStatus}
            onCellClick={handleCellClick}
            onStartGame={handleStartFromGame}
            onEndGame={handleEndFromGame}
            onResetGame={handleResetFromGame}
            onExit={handleExitFromGame}
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
  };

  //Cambia el tamaño de tablero según hemos elegido y deja un mensaje
  const handleSecondaryChoice = (choice: SizeChoice) => {
    setSizeChoice(choice);
    const selectedDimension = getBoardDimensionFromSizeChoice(choice);
    if (selectedDimension === null) return;

    setConnectionStatus(`Cargando tablero ${selectedDimension}x${selectedDimension}...`);
    requestResetBoard(selectedDimension)
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
            <button type="button" className="submit-button" onClick={() => handleDifficultyChoice('facil')}>
              Facil
            </button>
            <button type="button" className="submit-button" onClick={() => handleDifficultyChoice('medio')}>
              Medio
            </button>
            <button type="button" className="submit-button" onClick={() => handleDifficultyChoice('dificil')}>
              Dificil
            </button>
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
    </div>
  );
}

export default App;
