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

function App() {
  const [connectionStatus, setConnectionStatus] = useState('Without connection');
  const [username, setUsername] = useState('');
  const [currentScreen, setCurrentScreen] = useState<Screen>('home'); // Router interno de pantallas
  const [boardData, setBoardData] = useState<GameYData | null>(null);
  const [winner, setWinner] = useState<number | null>(null);

  //constantes para el temporizador
  const [turnTimer, setTurnTimer] = useState<NodeJS.Timeout | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    // Coloca la vista arriba al cambiar de pantalla
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [currentScreen]);

  const startGameWithUser = async (playerName: string) => {
    if (playerName.trim() !== '') {
      setUsername(playerName.trim());
      setConnectionStatus('Iniciando nueva partida...');
      try {
        // Solicita tablero inicial al backend
        const response = await fetch('http://localhost:3000/reset', {
          method: 'POST',
        });
        const data = await response.json();
        if (data.responseFromRust) {
          setBoardData(data.responseFromRust);
          setWinner(null);
          setCurrentScreen('game');
          setTimeout(() => {
            startTurnTimer();
          }, 500); //iniciando temporizador
          setConnectionStatus('Partida iniciada!');
        }
      } catch (error) {
        console.error('Error starting the game:', error);
        setWinner(null);
        setConnectionStatus('No se pudo iniciar la partida. Revisa que users-service esté levantado.');
      }
    }
  };

  const handleStart = async () => {
    await startGameWithUser(username);
  };

  const handleCellClick = async (index: number) => {
    if (winner !== null) return;

    setConnectionStatus(`Moviendo a la posicion ${index}...`);
    if (turnTimer) clearTimeout(turnTimer);//asegurar que está en tiempo
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
          setConnectionStatus(data.winner === 0 ? 'Has ganado!' : 'Ha ganado el bot!');
        } else {
          setConnectionStatus('Movimiento realizado!');
        }
      }
    } catch (error) {
      setConnectionStatus('Error realizando el movimiento');
    }
  }

  //metodo para iniciar el temporizador
  const startTurnTimer = () => {
    if (winner !== null) return;

    // limpiar temporizador anterior
    if (turnTimer) clearTimeout(turnTimer);

    setTimeLeft(30);

    let seconds = 30;

    // contador visual
    const intervalId = setInterval(() => {
      seconds--;
      setTimeLeft(seconds);
      if (seconds <= 0) clearInterval(intervalId);
    }, 1000);

    // timeout real
    const timeoutId = setTimeout(() => {
      handleTimeoutMove();
      clearInterval(intervalId);
    }, 30000);

    setTurnTimer(timeoutId);
  };

  //metodo para hacer un movimiento automático aleatorio si se acaba el tiempo
  const handleTimeoutMove = async () => {
    if (!boardData || winner !== null) return;

    setConnectionStatus("Tiempo agotado. Haciendo movimiento automático...");

    try {
      // Buscar celdas vacías
      const emptyCells: number[] = [];
      for (let i = 0; i < boardData.layout.length; i++) {
        if (boardData.layout[i] === '-') {
          emptyCells.push(i);
        }
      }

      if (emptyCells.length === 0) return;

      const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];

      await handleCellClick(randomIndex);

    } catch (error) {
      console.error("Error en movimiento automático", error);
    }
  };



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
    </div>
  );
}

export default App;
