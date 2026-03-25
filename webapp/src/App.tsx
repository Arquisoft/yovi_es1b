import { useEffect, useState } from 'react'

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
import type { Screen, DifficultyChoice, SizeChoice, HistoryGameRecord } from './types/game';

// Componentes UI (Modales)
import { HistoryModal } from './components/modals/HistoryModal';
import { SelectionModals } from './components/modals/SelectionModals';
import { ResultModal } from './components/modals/ResultModal';

function App() {
  // --- ESTADOS ---
  const [connectionStatus, setConnectionStatus] = useState('Without connection');
  const [username, setUsername] = useState('');
  const [userIcon, setUserIcon] = useState<string>(defaultAvatar);
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [difficultyChoice, setDifficultyChoice] = useState<DifficultyChoice | null>(null);
  const [sizeChoice, setSizeChoice] = useState<SizeChoice | null>(null);
  const [availableDifficulties, setAvailableDifficulties] = useState<string[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);
  // Historial
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<HistoryGameRecord[]>([]);
  const [historyFilter, setHistoryFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // --- HOOKS PERSONALIZADOS ---
  const { boardData, winner, processMove, resetGame, surrender } = useGameLogic(username);
  const { timeLeft: turnTimeLeft, isVisible: timerVisible, startTimer, stopTimer, setIsVisible: setTimerVisible 
  } = useGameTimer(() => triggerAutoMove());

  // --- EFECTOS ---
  useEffect(() => {
    gameService.getDifficulties()
      .then(setAvailableDifficulties)
      .catch(err => console.error('Error cargando dificultades:', err));
  }, []);

  // --- FUNCIONES DE LÓGICA ---

  const triggerAutoMove = async () => {
    if (!boardData || winner !== null) return;
    const flat = boardData.layout.replaceAll('/', '');
    const emptyCells = [...flat].map((c, i) => c === '.' ? i : -1).filter(i => i !== -1);
    
    if (emptyCells.length === 0) return;
    const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];

    setConnectionStatus('⏱️ Movimiento automático...');
    try {
      const data = await processMove(randomIndex, difficultyChoice!);
      if (data.winner !== null) setShowResultModal(true);
      else startTimer(difficultyChoice!);
    } catch (error) {
      setConnectionStatus('Error en movimiento automático');
    }
  };

  const handleCellClick = async (index: number) => {
    if (winner !== null) return;
    stopTimer();
    setConnectionStatus(`Moviendo...`);
    try {
      const data = await processMove(index, difficultyChoice!);
      if (data.winner !== null) {
        setTimerVisible(false);
        setShowResultModal(true);
      } else {
        setTimeout(() => startTimer(difficultyChoice!), 300);
      }
    } catch (error) {
      startTimer(difficultyChoice!);
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

    if (options?.resetChoices ?? true) {
      setDifficultyChoice('Easy');
      setSizeChoice('Tamaño 6x6x6');
    }

    try {
      const dim = options?.dimension ?? 6;
      await resetGame(dim, difficultyChoice || 'Easy');
      setCurrentScreen('game');
      setConnectionStatus('¡Partida lista!');
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
      <video className="menu-video-bg" autoPlay loop muted playsInline><source src={menuVideo} type="video/mp4"/></video>
      <div className="menu-video-overlay"/>

      {renderScreen()}

      <SelectionModals 
        currentScreen={currentScreen} difficultyChoice={difficultyChoice} sizeChoice={sizeChoice} 
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
