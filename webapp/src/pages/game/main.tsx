import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// Componentes UI y Pantallas
import GameScreen from '../../screens/GameScreen';
import { HistoryModal } from '../../components/modals/HistoryModal';
import { ResultModal } from '../../components/modals/ResultModal';
import { SelectionModals } from '../../components/modals/SelectionModals';

// Hooks, Servicios y Utils
import { useGameLogic } from '../../hooks/useGameLogic';
import { useGameTimer } from '../../hooks/useGameTimer';
import { gameService } from '../../services/gameService';
import { getBoardDimensionFromSizeChoice } from '../../utils/boardUtils';
import { DIFFICULTY_TRANSLATIONS, TURN_TIME_LIMIT } from '../../constants/config';

// Assets y Estilos
import menuVideo from '../../assets/background_video.mp4';
import '../../css/App.css';
import '../../css/Game.css';
import '../../css/Log.css';
import '../../index.css'

// Tipos
import type { DifficultyChoice, SizeChoice, HistoryGameRecord } from '../../types/game';
import { FriendsPanel } from '../../components/modals/FriendsPanel';

const GameApp = () => {
  // --- SEGURIDAD Y SESIÓN ---
  const username = localStorage.getItem('yovi_user') || '';
  const playerIcon = localStorage.getItem('yovi_user_icon');
  
  // Si no hay usuario, redirigimos inmediatamente a la home
  if (!username) {
    window.location.href = '/index.html';
    return null;
  }

  // --- ESTADOS DE UI ---
  const [connectionStatus, setConnectionStatus] = useState('Conectado');
  const [difficultyChoice, setDifficultyChoice] = useState<DifficultyChoice | null>('Easy');
  const [sizeChoice, setSizeChoice] = useState<SizeChoice | null>('Tamaño 6x6x6');
  const [availableDifficulties, setAvailableDifficulties] = useState<string[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showFriendsMenu, setShowFriendsMenu] = useState(false);

  // --- ESTADOS DE HISTORIAL ---
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<HistoryGameRecord[]>([]);
  const [historyFilter, setHistoryFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // --- HOOKS DE LÓGICA ---
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

  // --- EFECTOS INICIALES ---
  useEffect(() => {
    // 1. Cargar dificultades para los modales
    gameService.getDifficulties()
      .then(setAvailableDifficulties)
      .catch(err => console.error('Error API:', err));
    
    // 2. Iniciar la partida por defecto
    resetGame(6, 'Easy');
  }, []);

  // --- MANEJADORES DE ACCIONES ---

  const handleAutoMove = async () => {
    setConnectionStatus('⏱️ Movimiento automático...');
    try {
      const data = await executeAutoMove(difficultyChoice!, startTimer);
      if (data?.winner !== null) setShowResultModal(true);
      setConnectionStatus('Conectado');
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
      setConnectionStatus('Conectado');
    } catch (error) {
      setConnectionStatus('Error en el movimiento');
    }
  };

  const fetchHistory = async (page = 1, filter = historyFilter) => {
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

  const openFriendsMenu = () => {
    setShowFriendsMenu(true);
  };

  // Mapeo para la interfaz
  const displayDifficulty = difficultyChoice ? DIFFICULTY_TRANSLATIONS[difficultyChoice] : null;

  return (
    <div className="App">
      {/* Fondo de video */}
      <video className="menu-video-bg" autoPlay loop muted playsInline>
        <source src={menuVideo} type="video/mp4"/>
      </video>
      <div className="menu-video-overlay"/>

      {/* Pantalla Principal */}
      <GameScreen 
        username={username}
        playerIcon={playerIcon}
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
        onExit={() => { stopTimer(); window.location.href = '/index.html'; }}
        onChangeDifficulty={() => setDifficultyChoice(null)}
        onChangeSize={() => setSizeChoice(null)}
        onResetGame={() => resetGame(getBoardDimensionFromSizeChoice(sizeChoice) || 6, difficultyChoice || 'Easy')}
        onEndGame={async () => {
          stopTimer();
          setTimerVisible(false);
          await surrender(difficultyChoice!);
          setShowResultModal(true);
        }}
        onAddFriend={() => openFriendsMenu()}
      />

      {/* Modales de Configuración */}
      <SelectionModals 
        currentScreen="game" 
        difficultyChoice={difficultyChoice} 
        sizeChoice={sizeChoice} 
        availableDifficulties={availableDifficulties}
        onDifficultySelect={(d) => { 
          setDifficultyChoice(d); 
          resetGame(getBoardDimensionFromSizeChoice(sizeChoice) || 6, d); 
        }}
        onSizeSelect={(s) => { 
          setSizeChoice(s); 
          resetGame(getBoardDimensionFromSizeChoice(s)!, difficultyChoice || 'Easy'); 
        }}
      />

      {/* Modales de Resultados e Historial */}
      <ResultModal 
        isOpen={showResultModal} 
        winner={winner} 
        onClose={() => setShowResultModal(false)} 
      />

      <HistoryModal 
        isOpen={showHistory} 
        onClose={() => setShowHistory(false)} 
        data={historyData}
        currentPage={currentPage} 
        totalPages={totalPages} 
        currentFilter={historyFilter}
        onPageChange={fetchHistory}
        onFilterChange={(f) => { setHistoryFilter(f); fetchHistory(1, f); }}
      />

      <FriendsPanel
        isOpen={showFriendsMenu}
        onClose={() => setShowFriendsMenu(false)}
        username={username}
      />
    </div>
  );
};

// Renderizado directo al root
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GameApp />
  </React.StrictMode>
);
