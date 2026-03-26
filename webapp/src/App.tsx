import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';

// Estilos y assets
import './css/App.css'
import './css/Log.css'
import './css/Game.css'
import menuVideo from './assets/background_video.mp4';
import defaultAvatar from './assets/icon/SinAvatar.png';

// Pantallas
import HomeScreen from './screens/HomeScreen';
import RegisterScreen from './screens/RegisterScreen';
import LoginScreen from './screens/LoginScreen';
import GameScreen from './screens/GameScreen';

// Hooks, Servicios y Utils
import { useGameTimer } from './hooks/useGameTimer';
import { useGameLogic } from './hooks/useGameLogic';
import { gameService } from './services/gameService';
import { getBoardDimensionFromSizeChoice } from './utils/boardUtils';
import { DIFFICULTY_TRANSLATIONS, TURN_TIME_LIMIT } from './constants/config';

// Tipos
import type { DifficultyChoice, SizeChoice, HistoryGameRecord } from './types/game';

// Componentes UI (Modales)
import { HistoryModal } from './components/modals/HistoryModal';
import { SelectionModals } from './components/modals/SelectionModals';
import { ResultModal } from './components/modals/ResultModal';

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // --- ESTADOS DE UI ---
  const [connectionStatus, setConnectionStatus] = useState('Without connection');
  const [username, setUsername] = useState('');
  const [userIcon, setUserIcon] = useState<string>(defaultAvatar);
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [difficultyChoice, setDifficultyChoice] = useState<DifficultyChoice | null>(null);
  const [sizeChoice, setSizeChoice] = useState<SizeChoice | null>(null);
  const [availableDifficulties, setAvailableDifficulties] = useState<string[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);

  // --- PERSISTENCIA DE SESIÓN ---
  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem('yovi_user') || '';
  });

  // --- ESTADOS DE HISTORIAL ---
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<HistoryGameRecord[]>([]);
  const [historyFilter, setHistoryFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // --- HOOKS DE LÓGICA CENTRALIZADA ---
  const { 
    boardData, 
    winner, 
    executeHumanMove, 
    executeAutoMove, 
    resetGame, 
    surrender 
  } = useGameLogic(username);
  
  const { 
    timeLeft: turnTimeLeft, 
    isVisible: timerVisible, 
    startTimer, 
    stopTimer, 
    setIsVisible: setTimerVisible 
  } = useGameTimer(() => handleAutoMove());

  // --- EFECTOS ---
  
  // Guardar usuario en el navegador para evitar pérdidas en F5
  useEffect(() => {
    localStorage.setItem('yovi_user', username);
  }, [username]);

  // Cargar dificultades al arrancar
  useEffect(() => {
    gameService.getDifficulties()
      .then(setAvailableDifficulties)
      .catch(err => console.error('Error API:', err));
  }, []);

  // --- MANEJADORES DE ACCIONES (Delegando al Hook) ---

  const handleAutoMove = async () => {
    setConnectionStatus('⏱️ Movimiento automático...');
    try {
      const data = await executeAutoMove(difficultyChoice!, startTimer);
      if (data?.winner !== null) setShowResultModal(true);
    } catch (error) {
      setConnectionStatus('Error en movimiento automático');
    }
  };

  const handleCellClick = async (index: number) => {
    if (winner !== null) return;
    setConnectionStatus(`Moviendo...`);
    try {
      const data = await executeHumanMove(index, difficultyChoice!, stopTimer, startTimer);
      if (data.winner !== null) {
        setTimerVisible(false);
        setShowResultModal(true);
      }
    } catch (error) {
      setConnectionStatus('Error en el movimiento');
    }
  };

  const startGameWithUser = async (
    playerName: string,
    options?: { dimension?: number | null; resetChoices?: boolean },
    icon?: string | null
  ) => {
    if (!playerName.trim()) return;
    setUsername(playerName.trim());
    setUserIcon(icon && icon.trim() ? icon : defaultAvatar);

    try {
      setDifficultyChoice('Easy');
      setSizeChoice('Tamaño 6x6x6');
      await resetGame(6, 'Easy');
      setConnectionStatus('¡Partida lista!');
      navigate('/game'); 
    } catch (error) {
      setConnectionStatus('Error al conectar con el servidor.');
    }
  };

  const fetchHistory = async (page = 1, filter = historyFilter) => {
    if (!username) return;
    try {
      const result = await gameService.getHistory(username, page, filter);
      setHistoryData(result.data || []);
      setTotalPages(result.total_pages || 1);
      setCurrentPage(result.page || 1);
      setShowHistory(true);
    } catch (error) {
      console.error('Error historial:', error);
    }
  };

  // --- RENDERIZADO DE PANTALLAS ---
  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen username={username} onUsernameChange={setUsername} onStart={() => startGameWithUser(username)} onGoToRegister={() => setCurrentScreen('register')} onGoToLogin={() => setCurrentScreen('login')} />;
      case 'game':
        // Mapeamos el valor del estado (Easy/Medium/Hard) al que espera el componente (facil/medio/dificil)
        const displayDifficulty = difficultyChoice ? DIFFICULTY_TRANSLATIONS[difficultyChoice] : null;

        return (
          <GameScreen 
            // --- DATOS (Las que te faltaban) ---
            username={username}
            playerIcon={userIcon}
            boardData={boardData}
            winner={winner}
            connectionStatus={connectionStatus}
            
            // --- CONFIGURACIÓN ---
            difficultyChoice={displayDifficulty as any} 
            selectedBoardDimension={getBoardDimensionFromSizeChoice(sizeChoice)}
            sizeLabel={sizeChoice}

            // --- TIEMPOS ---
            turnTimeLeft={turnTimeLeft}
            timerVisible={timerVisible}
            turnTimeLimit={difficultyChoice ? (TURN_TIME_LIMIT[difficultyChoice] ?? null) : null}

            // --- FUNCIONES (Acciones) ---
            onCellClick={handleCellClick}
            onFetchHistory={() => fetchHistory()}
            onExit={() => { stopTimer(); setCurrentScreen('home'); }}
            onChangeDifficulty={() => setDifficultyChoice(null)}
            onChangeSize={() => setSizeChoice(null)}
            onResetGame={() => resetGame(getBoardDimensionFromSizeChoice(sizeChoice) || 6, difficultyChoice || 'Easy')}
            
            // --- RENDICIÓN (Llamando al hook) ---
            onEndGame={async () => {
              stopTimer();
              setTimerVisible(false);
              const success = await surrender(difficultyChoice!);
              if (success) {
                setConnectionStatus('Has perdido (rendición)');
                setShowResultModal(true);
              }
            }}
          />
        );
      case 'register':
        return (
          <RegisterScreen
            onBack={() => setCurrentScreen('home')}
            onCreateAccount={(name, icon) => startGameWithUser(name, undefined, icon)}
          />
        );
      case 'login':
        return (
          <LoginScreen
            onBack={() => setCurrentScreen('home')}
            onLogin={(name, icon) => startGameWithUser(name, undefined, icon)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="App">
      {/* Fondo de video persistente */}
      <video className="menu-video-bg" autoPlay loop muted playsInline>
        <source src={menuVideo} type="video/mp4"/>
      </video>
      <div className="menu-video-overlay"/>

      {/* RUTAS DE NAVEGACIÓN (SPA) */}
      <Routes>
        <Route path="/" element={
          <HomeScreen 
            username={username} 
            onUsernameChange={setUsername} 
            onStart={() => handleStartGame(username)} 
            onGoToRegister={() => navigate('/register')} 
            onGoToLogin={() => navigate('/login')} 
          />
        } />

        <Route path="/register" element={
          <RegisterScreen onBack={() => navigate('/')} onCreateAccount={handleStartGame} />
        } />

        <Route path="/login" element={
          <LoginScreen onBack={() => navigate('/')} onLogin={handleStartGame} />
        } />

        <Route path="/game" element={
          username ? (
            <GameScreen 
              username={username}
              boardData={boardData}
              winner={winner}
              connectionStatus={connectionStatus}
              difficultyChoice={displayDifficulty as any} 
              selectedBoardDimension={getBoardDimensionFromSizeChoice(sizeChoice)}
              sizeLabel={sizeChoice}
              turnTimeLeft={turnTimeLeft}
              timerVisible={timerVisible}
              turnTimeLimit={difficultyChoice ? (TURN_TIME_LIMIT[difficultyChoice] ?? null) : null}
              onCellClick={handleCellClick}
              onFetchHistory={() => fetchHistory()}
              onExit={() => { stopTimer(); navigate('/'); }}
              onChangeDifficulty={() => setDifficultyChoice(null)}
              onChangeSize={() => setSizeChoice(null)}
              onResetGame={() => resetGame(getBoardDimensionFromSizeChoice(sizeChoice) || 6, difficultyChoice || 'Easy')}
              onEndGame={async () => {
                stopTimer();
                setTimerVisible(false);
                await surrender(difficultyChoice!);
                setConnectionStatus('Has perdido (rendición)');
                setShowResultModal(true);
              }}
            />
          ) : (
            <Navigate to="/" />
          )
        } />
      </Routes>

      {/* COMPONENTES GLOBALES (MODALES) */}
      <SelectionModals 
        currentScreen={location.pathname === '/game' ? 'game' : 'home'} 
        difficultyChoice={difficultyChoice} 
        sizeChoice={sizeChoice} 
        availableDifficulties={availableDifficulties}
        onDifficultySelect={(d) => { setDifficultyChoice(d); resetGame(getBoardDimensionFromSizeChoice(sizeChoice) || 6, d); }}
        onSizeSelect={(s) => { setSizeChoice(s); resetGame(getBoardDimensionFromSizeChoice(s)!, difficultyChoice || 'Easy'); }}
      />

      <ResultModal isOpen={showResultModal} winner={winner} onClose={() => setShowResultModal(false)} />

      <HistoryModal 
        isOpen={showHistory} onClose={() => setShowHistory(false)} data={historyData}
        currentPage={currentPage} totalPages={totalPages} currentFilter={historyFilter}
        onPageChange={fetchHistory}
        onFilterChange={(f) => { setHistoryFilter(f); fetchHistory(1, f); }}
      />
    </div>
  );
}

export default App;
