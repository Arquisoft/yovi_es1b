import { useEffect, useState } from 'react'
import './App.css'
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
type SizeChoice = 'Tamaño 5x5x5' | 'Tamaño 7x7x7' | 'Tamaño 9x9x9';

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

  const startGameWithUser = async (playerName: string) => {
    if (playerName.trim() !== '') {
      setUsername(playerName.trim());
      setConnectionStatus('Iniciando nueva partida...');
      try {
        // Solicita tablero inicial al users-service
        const response = await fetch('http://localhost:3000/reset', {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error(`Reset failed with status ${response.status}`);
        }

        const data = await response.json();
        const board = data.responseFromRust ?? data.board ?? data;

        if (board && board.layout) {
          // Cada partida nueva exige volver a elegir dificultad y opcion secundaria
          setDifficultyChoice(null);
          setSizeChoice(null);
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
        setBoardData(data.responseFromRust);
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
            boardData={boardData}
            winner={winner}
            connectionStatus={connectionStatus}
            onCellClick={handleCellClick}
            onExit={() => setCurrentScreen('home')}
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

  const handleDifficultyChoice = (choice: DifficultyChoice) => {
    setDifficultyChoice(choice);
  };

  const handleSecondaryChoice = (choice: SizeChoice) => {
    setSizeChoice(choice);
  };

  const handlePlayAgain = async () => {
    await startGameWithUser(username);
  };

  const handleGoHomeFromResult = () => {
    setShowResultModal(false);
    setCurrentScreen('home');
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
            <button type="button" className="submit-button" onClick={() => handleSecondaryChoice('Tamaño 5x5x5')}>
              Tamaño 5x5x5
            </button>
            <button type="button" className="submit-button" onClick={() => handleSecondaryChoice('Tamaño 7x7x7')}>
              Tamaño 7x7x7
            </button>
            <button type="button" className="submit-button" onClick={() => handleSecondaryChoice('Tamaño 9x9x9')}>
              Tamaño 9x9x9
            </button>
          </div>
        </div>
      )}

      {currentScreen === 'game' && winner !== null && showResultModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Resultado de la partida">
          <div className="modal-box">
            <h3>{winner === 0 ? 'Has ganado la partida!' : 'Has perdido la partida.'}</h3>
            <div className="modal-actions">
              <button type="button" className="submit-button" onClick={handlePlayAgain}>
                Jugar otra vez
              </button>
              <button type="button" className="submit-button" onClick={handleGoHomeFromResult}>
                Volver al inicio
              </button>
              <button type="button" className="submit-button" onClick={handleCloseResultModal}>
                Cerrar ventana
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
