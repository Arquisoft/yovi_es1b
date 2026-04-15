import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';

// Componentes UI y Pantallas
import GameScreen from '../../screens/GameScreen';
import { HistoryModal } from '../../components/modals/HistoryModal';
import { ResultModal } from '../../components/modals/ResultModal';
import { SelectionModals } from '../../components/modals/SelectionModals';
import { PublicProfileModal } from '../../components/modals/PublicProfileModal';
import { GuestAccessModal, type GuestAccessReason } from '../../components/modals/GuestAccessModal';
import { ProfileScreen } from '../../screens/ProfileScreen';
import { TutorialScreen } from '../../screens/TutorialScreen';
import { MenuBackgroundChrome } from '../../components/layout/MenuBackgroundChrome';

// Hooks, Servicios y Utils
import { useMenuBackgroundMedia } from '../../hooks/useMenuBackgroundMedia';
import { useGameLogic } from '../../hooks/useGameLogic';
import { useGameTimer } from '../../hooks/useGameTimer';
import { gameService } from '../../services/gameService';
import { getBoardDimensionFromSizeChoice } from '../../utils/boardUtils';
import {TURN_TIME_LIMIT, UI_TO_ENGLISH_DIFFICULTY} from '../../constants/config';
import { getGameIdentity, mapUiDifficultyToBackend, resolveIconFromAssets } from '../../utils/gamePageUtils';
import { clearGuestSession, isGuestSession } from '../../utils/sessionUtils';

// Assets y Estilos
import '../../css/App.css';
import '../../css/Game.css';
import '../../css/Log.css';
import '../../index.css';

// Tipos
import type { DifficultyChoice, SizeChoice, HistoryGameRecord } from '../../types/game';
import { FriendsPanel } from '../../components/modals/FriendsPanel';


const iconModules = import.meta.glob('../../assets/icon/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const botIconPool = Object.entries(iconModules)
  .filter(([path]) => !path.toLowerCase().includes('sinavatar'))
  .map(([, src]) => src);

const getRandomIndex = (length: number): number | null => {
  if (!Number.isInteger(length) || length <= 0) return null;

  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) return null;

  const limit = Math.floor(0x100000000 / length) * length;
  const buffer = new Uint32Array(1);

  let value = 0;
  do {
    cryptoApi.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);

  return value % length;
};

const pickRandomBotIcon = (): string | null => {
  const pool = botIconPool.length ? botIconPool : Object.values(iconModules);
  if (!pool.length) return null;
  const index = getRandomIndex(pool.length);
  if (index === null) return null;
  return pool[index] ?? null;
};

const GameApp = () => {
  const isGuestMode = isGuestSession();
  const storedUsername = localStorage.getItem('yovi_user') || '';

  useEffect(() => {
    if (!storedUsername && !isGuestMode) {
      globalThis.location.href = '/index.html';
    }
  }, [isGuestMode, storedUsername]);

  if (!storedUsername && !isGuestMode) return null;

  return <GameAppContent isGuestMode={isGuestMode} storedUsername={storedUsername} />;
};

type GameAppContentProps = {
  isGuestMode: boolean;
  storedUsername: string;
};

const GameAppContent = ({ isGuestMode, storedUsername }: GameAppContentProps) => {
  // --- SEGURIDAD Y SESIÓN ---
  const { displayName, friendCode, username } = getGameIdentity(isGuestMode, storedUsername);
  const [playerIcon, setPlayerIcon] = useState(resolveIconFromAssets(isGuestMode ? null : localStorage.getItem('yovi_user_icon'), iconModules));
  const [botIcon] = useState<string | null>(() => pickRandomBotIcon());
  const handleAutoMoveRef = useRef<() => Promise<void> | void>(() => {});
  const handleTimeUp = useCallback(() => {
    void handleAutoMoveRef.current();
  }, []);

  // --- ESTADOS DE UI ---
  const [difficultyChoice, setDifficultyChoice] = useState<DifficultyChoice | null>('Fácil');
  const [sizeChoice, setSizeChoice] = useState<SizeChoice | null>('Pequeño');
  const [previousDifficultyChoice, setPreviousDifficultyChoice] = useState<DifficultyChoice | null>('Easy');
  const [previousSizeChoice, setPreviousSizeChoice] = useState<SizeChoice | null>('Pequeño');
  const [availableDifficulties, setAvailableDifficulties] = useState<string[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showFriendsMenu, setShowFriendsMenu] = useState(false);
  const [showProfileScreen, setShowProfileScreen] = useState(false);
  const [showTutorialScreen, setShowTutorialScreen] = useState(false);
  const [publicProfileToView, setPublicProfileToView] = useState<string | null>(null);
  const background = useMenuBackgroundMedia();

  // --- ESTADOS DE HISTORIAL ---
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<HistoryGameRecord[]>([]);
  const [historyFilter, setHistoryFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [guestAccessReason, setGuestAccessReason] = useState<GuestAccessReason | null>(null);

  // --- HOOKS DE LÓGICA ---
  const {
    boardData,
    winner,
    executeHumanMove,
    executeAutoMove,
    resetGame,
    surrender,
  } = useGameLogic();

  const {
    timeLeft: turnTimeLeft,
    isVisible: timerVisible,
    startTimer,
    stopTimer,
    setIsVisible: setTimerVisible,
  } = useGameTimer(handleTimeUp);

  const startNewGame = useCallback((size: number, difficulty: DifficultyChoice) => {
    stopTimer();
    setTimerVisible(false);
    void resetGame(size, difficulty);
  }, [resetGame, stopTimer, setTimerVisible]);

  // --- EFECTOS INICIALES ---
  useEffect(() => {
    // 1. Cargar dificultades para los modales
    gameService.getDifficulties()
      .then(setAvailableDifficulties)
      .catch((err) => console.error('Error API:', err));

    // 2. Iniciar la partida por defecto
    queueMicrotask(() => {
      void startNewGame(6, 'Easy');
    });
  }, [startNewGame]);

  useEffect(() => {
    let active = true;

    const syncProfileIcon = async () => {
      try {
        const profile = await gameService.getProfile();
        if (!active || profile?.error) return;

        const resolvedIcon = resolveIconFromAssets(
          typeof profile?.iconName === 'string' ? profile.iconName : profile?.icon,
          iconModules
        );
        if (resolvedIcon) {
          setPlayerIcon(resolvedIcon);
          localStorage.setItem('yovi_user_icon', resolvedIcon);
        }
      } catch {
        // En caso de error de red, mantenemos el icono local actual.
      }
    };

    syncProfileIcon();
    return () => {
      active = false;
    };
  }, [username]);

  // --- MANEJADORES DE ACCIONES ---
  const handleAutoMove = useCallback(async () => {
    try {
      const data = await executeAutoMove(difficultyChoice!, startTimer);
      if (data?.winner !== null) setShowResultModal(true);
    } catch {}
  }, [difficultyChoice, executeAutoMove, startTimer]);

  useEffect(() => {
    handleAutoMoveRef.current = handleAutoMove;
  }, [handleAutoMove]);
  const handleCellClick = async (index: number) => {
    if (winner !== null) return;
    try {
      const data = await executeHumanMove(index, difficultyChoice!, stopTimer, startTimer);
      if (data.winner !== null) {
        setTimerVisible(false);
        setShowResultModal(true);
      }
    } catch {}
  };

  const fetchHistory = async (page = 1, filter = historyFilter) => {
    try {
      const result = await gameService.getHistory( page, filter);
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

  const openGuestAccessPrompt = (reason: GuestAccessReason) => {
    setGuestAccessReason(reason);
  };

  // Mapeo para la interfaz
  //const displayDifficulty = difficultyChoice;

  return (
    <MenuBackgroundChrome
      audioRef={background.audioRef}
      isVideoPaused={background.isVideoPaused}
      musicVolume={background.musicVolume}
      setIsVideoPaused={background.setIsVideoPaused}
      setMusicVolume={background.setMusicVolume}
      setShowSettings={background.setShowSettings}
      settingsAriaLabel="Configuración de elementos de fondo"
      settingsTitle="Configuración de elementos de fondo"
      showSettings={background.showSettings}
      videoLabel="Video en movimiento"
      videoRef={background.videoRef}
    >
      <GameScreen
        username={username}
        displayName={displayName}
        playerIcon={playerIcon}
        botIcon={botIcon}
        boardData={boardData}
        winner={winner}
        difficultyChoice={difficultyChoice}
        selectedBoardDimension={getBoardDimensionFromSizeChoice(sizeChoice)}
        sizeLabel={sizeChoice}
        turnTimeLeft={turnTimeLeft}
        timerVisible={timerVisible}
        turnTimeLimit={difficultyChoice ? (TURN_TIME_LIMIT[UI_TO_ENGLISH_DIFFICULTY[difficultyChoice] ?? difficultyChoice] ?? null) : null}
        onCellClick={handleCellClick}
        onFetchHistory={() => (isGuestMode ? openGuestAccessPrompt('historial') : fetchHistory())}
        onExit={() => {
          stopTimer();
          if (isGuestMode) {
            clearGuestSession();
          }
          globalThis.location.href = '/index.html';
        }}
        onChangeDifficulty={(uiDiff: string) => {
          const valueForBackend = mapUiDifficultyToBackend(uiDiff);
          setDifficultyChoice(uiDiff);
          setPreviousDifficultyChoice(uiDiff);
          const dimension = getBoardDimensionFromSizeChoice(sizeChoice) || 6;
          startNewGame(dimension, valueForBackend);
        }}
        onChangeSize={(newSize: SizeChoice) => {
          setPreviousSizeChoice(newSize);
          setSizeChoice(newSize);
          const dimension = getBoardDimensionFromSizeChoice(newSize) || 6;
          startNewGame(dimension, difficultyChoice || 'Easy');
        }}
        onResetGame={() => startNewGame(getBoardDimensionFromSizeChoice(sizeChoice) || 6, difficultyChoice || 'Easy')}
        onEndGame={async () => {
          stopTimer();
          setTimerVisible(false);
          await surrender(difficultyChoice!);
          setShowResultModal(true);
        }}
        onAddFriend={() => (isGuestMode ? openGuestAccessPrompt('amigos') : openFriendsMenu())}
        onViewProfile={() => (isGuestMode ? openGuestAccessPrompt('perfil') : setShowProfileScreen(true))}
        onOpenSettings={() => background.setShowSettings(true)}
        onOpenTutorial={() => setShowTutorialScreen(true)}
      />

      <SelectionModals
        currentScreen="game"
        difficultyChoice={difficultyChoice}
        sizeChoice={sizeChoice}
        availableDifficulties={availableDifficulties}
        onDifficultySelect={(d) => {
          setDifficultyChoice(d);
          setPreviousDifficultyChoice(d);
          startNewGame(getBoardDimensionFromSizeChoice(sizeChoice) || 6, d);
        }}
        onSizeSelect={(s) => {
          setSizeChoice(s);
          setPreviousSizeChoice(s);
          startNewGame(getBoardDimensionFromSizeChoice(s)!, difficultyChoice || 'Easy');
        }}
        onDifficultyCancel={() => setDifficultyChoice(previousDifficultyChoice || 'Easy')}
        onSizeCancel={() => setSizeChoice(previousSizeChoice || 'Pequeño')}
      />

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
          displayName={displayName}
          friendCode={friendCode}
          icon={playerIcon}
          onTriggerPublicProfile={(targetUser) => setPublicProfileToView(targetUser)}
      />

      {publicProfileToView && (
          <PublicProfileModal
              username={publicProfileToView}
              onClose={() => setPublicProfileToView(null)}
          />
      )}

      <ProfileScreen
          isOpen={showProfileScreen}
          username={username}
          onClose={() => setShowProfileScreen(false)}
      />

      <TutorialScreen
        isOpen={showTutorialScreen}
        onClose={() => setShowTutorialScreen(false)}
      />
      <GuestAccessModal
        reason={guestAccessReason}
        onClose={() => setGuestAccessReason(null)}
        onGoLogin={() => {
          setGuestAccessReason(null)
          globalThis.location.href = '/login.html'
        }}
        onGoRegister={() => {
          setGuestAccessReason(null)
          globalThis.location.href = '/register.html'
        }}
      />
    </MenuBackgroundChrome>
  );
};

// Renderizado directo al root
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GameApp />
  </React.StrictMode>
);

export { GameApp, GameAppContent };


