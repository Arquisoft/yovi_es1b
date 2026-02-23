import { useState } from 'react'
import './App.css'
import RegisterForm from './home';
import reactLogo from './assets/react.svg'
import menuVideo from './assets/background_video.mp4';

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
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [boardData, setBoardData] = useState<GameYData | null>(null);
  const [winner, setWinner] = useState<number | null>(null);

  const handleStart = async () => {
    if (username.trim() !== '') {
      setConnectionStatus('Iniciando nueva partida...');
      try {
        const response = await fetch('http://localhost:3000/reset', {
          method: 'POST',
        });

        const data = await response.json();

        if (data.responseFromRust) {
          setBoardData(data.responseFromRust);
          setWinner(null);
          setCurrentScreen('game');
          setConnectionStatus('Partida iniciada!');
        }
      } catch (error) {
        console.error('Error starting the game:', error);
        setCurrentScreen('game');
        setWinner(null);
      }
    }
  }

  const handleCellClick = async (index: number) => {
    if (winner !== null) return;

    setConnectionStatus(`Moviendo a la posicion ${index}...`);
    try {
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

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return (
          <div className="home-screen">
            <h2 className="welcome-title">Bienvenido al JuegoY</h2>
            <RegisterForm
              onGoToRegister={() => setCurrentScreen('register')}
              onGoToLogin={() => setCurrentScreen('login')}
            />

            <div>
              <h3>Quick Access (Simulated Login)</h3>
              <input
                type="text"
                placeholder="Your nickname"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <button onClick={handleStart}>Start playing</button>
            </div>
          </div>
        );

      case 'game':
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
              {boardData ? (() => {
                let globalIndex = 0;
                return boardData.layout.split('/').map((row, rowIndex) => (
                  <div key={rowIndex} className="board-row">
                    {row.split('').map((cell, cellIndex) => {
                      const currentIndex = globalIndex++;
                      return (
                        <button
                          key={cellIndex}
                          type="button"
                          className={`cell ${cell === 'B' ? 'blue' : cell === 'R' ? 'red' : 'empty'}`}
                          onClick={() => cell === '.' && winner === null && handleCellClick(currentIndex)}
                          disabled={cell !== '.' || winner !== null}
                          aria-label={`Celda ${currentIndex}, ${cell === 'B' ? 'ocupada por azul' : cell === 'R' ? 'ocupada por rojo' : 'vacia'}`}
                        >
                          {cell !== '.' ? cell : ''}
                        </button>
                      );
                    })}
                  </div>
                ));
              })() : <p>Carga el tablero para comenzar</p>}
            </div>

            <div className="game-controls">
              <p className="status-text">{connectionStatus}</p>
              <button className="exit-button" onClick={() => setCurrentScreen('home')}>Salir</button>
            </div>
          </div>
        );

      case 'register':
        return (
          <div className="home-screen">
            <h2 className="welcome-title">Pantalla de Registro</h2>
            <div className="choose-option menu-content">
              <p>Aqui ira tu formulario de registro.</p>
              <button type="button" className="submit-button" onClick={() => setCurrentScreen('home')}>
                Volver
              </button>
            </div>
          </div>
        );

      case 'login':
        return (
          <div className="home-screen">
            <h2 className="welcome-title">Pantalla de Inicio de sesion</h2>
            <div className="choose-option menu-content">
              <p>Aqui ira tu formulario de inicio de sesion.</p>
              <button type="button" className="submit-button" onClick={() => setCurrentScreen('home')}>
                Volver
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="App">
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
      {renderScreen()}
    </div>
  );
}

export default App;
