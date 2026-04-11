import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';

// Componentes UI y Pantallas
import GameScreen from '../../screens/GameScreen';
import { HistoryModal } from '../../components/modals/HistoryModal';
import { ResultModal } from '../../components/modals/ResultModal';
import { SelectionModals } from '../../components/modals/SelectionModals';
import { PublicProfileModal } from '../../components/modals/PublicProfileModal';
import { ProfileScreen } from '../../screens/ProfileScreen';
import { TutorialScreen } from '../../screens/TutorialScreen';

// Hooks, Servicios y Utils
import { useGameLogic } from '../../hooks/useGameLogic';
import { useGameTimer } from '../../hooks/useGameTimer';
import { gameService } from '../../services/gameService';
import { getBoardDimensionFromSizeChoice } from '../../utils/boardUtils';
import {TURN_TIME_LIMIT, UI_TO_ENGLISH_DIFFICULTY} from '../../constants/config';
import { clearSession } from '../../utils/sessionUtils';

// Assets y Estilos
import menuVideo from '../../assets/background_video.mp4';
import backgroundMusic from '../../assets/background_music.mp3';
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

const pickRandomBotIcon = (): string | null => {
  const pool = botIconPool.length ? botIconPool : Object.values(iconModules);
  if (!pool.length) return null;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? null;
};

const resolveUserIcon = (rawIcon: string | null | undefined): string | null => {
  const iconValue = String(rawIcon || '').trim();
  if (!iconValue) return null;

  // Si ya viene como URL/ruta válida, la usamos tal cual.
  if (
    iconValue.startsWith('http://') ||
    iconValue.startsWith('https://') ||
    iconValue.startsWith('/') ||
    iconValue.startsWith('data:')
  ) {
    return iconValue;
  }

  // Si viene como nombre de archivo (ej: "hombre1.png"), lo resolvemos desde assets.
  const match = Object.entries(iconModules).find(([path]) =>
    path.toLowerCase().includes(iconValue.toLowerCase())
  );
  return match ? match[1] : iconValue;
};

// Configuración global para fetch para detectar 401
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  if (response.status === 401) {
    // Si la sesión expira o es inválida, limpiamos y redirigimos
    clearSession();
    localStorage.removeItem('yovi_user');
    localStorage.removeItem('yovi_friend_code');
    localStorage.removeItem('yovi_user_icon');
    localStorage.removeItem('yovi_user_nickname');
    window.location.href = '/index.html';
  }
  return response;
};

const GameApp = () => {
  // --- SEGURIDAD Y SESIÓN ---
  const username = localStorage.getItem('yovi_user') || '';
  const friendCode = localStorage.getItem('yovi_friend_code') || '';
  const displayName = localStorage.getItem('yovi_user_nickname') || username;
  const [playerIcon, setPlayerIcon] = useState(resolveUserIcon(localStorage.getItem('yovi_user_icon')));
  const [botIcon, setBotIcon] = useState<string | null>(() => pickRandomBotIcon());
    const handleAutoMoveRef = useRef<() => Promise<void> | void>(() => {});
    const handleTimeUp = useCallback(() => {
        void handleAutoMoveRef.current();
    }, []);
  // Si no hay usuario, redirigimos inmediatamente a la home
  if (!username) {
    window.location.href = '/index.html';
    return null;
  }

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
  const [showSettings, setShowSettings] = useState(false);
  const [publicProfileToView, setPublicProfileToView] = useState<string | null>(null);
  const [musicVolume, setMusicVolume] = useState(0.4);
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

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
    setBotIcon(pickRandomBotIcon());
    void resetGame(size, difficulty);
  }, [resetGame, stopTimer, setTimerVisible]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.min(1, Math.max(0, musicVolume));
    }
  }, [musicVolume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const storedTime = Number(localStorage.getItem('yovi_bg_time') || '0');
    if (!Number.isNaN(storedTime) && storedTime > 0) {
      const applyTime = () => {
        audio.currentTime = Math.min(storedTime, Math.max(0, audio.duration || storedTime));
      };
      if (audio.readyState >= 1) {
        applyTime();
      } else {
        audio.addEventListener('loadedmetadata', applyTime, { once: true });
      }
    }

    const saveTime = () => {
      localStorage.setItem('yovi_bg_time', String(audio.currentTime || 0));
    };
    const intervalId = window.setInterval(saveTime, 1000);
    window.addEventListener('beforeunload', saveTime);
    document.addEventListener('visibilitychange', saveTime);

    return () => {
      saveTime();
      window.clearInterval(intervalId);
      window.removeEventListener('beforeunload', saveTime);
      document.removeEventListener('visibilitychange', saveTime);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isVideoPaused) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  }, [isVideoPaused]);

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

        const resolvedIcon = resolveUserIcon(
          typeof profile?.iconName === 'string' ? profile.iconName : profile?.icon
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
      if (result.error && result.error.includes("401")) return; // interceptor redirigirá
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

  const handleExit = async () => {
      stopTimer();
      try {
          await gameService.logout();
      } catch (e) {
          console.error("Error al hacer logout", e);
      }
      clearSession();
      localStorage.removeItem('yovi_user');
      localStorage.removeItem('yovi_friend_code');
      localStorage.removeItem('yovi_user_icon');
      localStorage.removeItem('yovi_user_nickname');
      window.location.href = '/index.html';
  };

  // Mapeo para la interfaz
  //const displayDifficulty = difficultyChoice;

  return (
    <div className="App">
      {/* Fondo de video */}
      <video ref={videoRef} className="menu-video-bg" autoPlay loop muted playsInline>
        <source src={menuVideo} type="video/mp4" />
      </video>
      <div className="menu-video-overlay" />
      <audio ref={audioRef} className="bg-music" src={backgroundMusic} autoPlay loop />

      {/* Pantalla Principal */}
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
        onFetchHistory={() => fetchHistory()}
        onExit={handleExit}
        onChangeDifficulty={(uiDiff: string) => {
          // 1. Mapa de traducción para el backend
          const backendMap: Record<string, string> = {
            'Fácil': 'facil',
            'Medio': 'medio',
            'Difícil': 'dificil'
          };

          const valueForBackend = backendMap[uiDiff] || 'facil';

          // 2. Guardamos el valor (puedes guardar el "bonito" para la UI)
          setDifficultyChoice(uiDiff as any);
          setPreviousDifficultyChoice(uiDiff as any);
          
          // 3. Llamamos al servicio con el valor que entiende el Backend
          const dimension = getBoardDimensionFromSizeChoice(sizeChoice) || 6;
          startNewGame(dimension, valueForBackend as any);
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
        onAddFriend={() => openFriendsMenu()}
        onViewProfile={() => setShowProfileScreen(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenTutorial={() => setShowTutorialScreen(true)}
      />

      {/* Modales de Configuración */}
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

      {/* 1. Panel de Amigos: el emisor del evento */}
      <FriendsPanel
          isOpen={showFriendsMenu}
          onClose={() => setShowFriendsMenu(false)}
          username={username} // Tu sesión
          displayName={displayName}
          friendCode={friendCode}
          icon={playerIcon}
          // Captura el nombre del amigo y lo guarda en el estado local de main.tsx
          onTriggerPublicProfile={(targetUser) => setPublicProfileToView(targetUser)}
      />

      {/* 2. Modal de Perfil Público: el receptor */}
      {/* Solo se monta si hay un nombre en el estado 'publicProfileToView' */}
      {publicProfileToView && (
          <PublicProfileModal
              username={publicProfileToView} // El usuario a consultar (distinto al de la sesión)
              onClose={() => setPublicProfileToView(null)} // Al cerrar, limpiamos para poder abrir otro
          />
      )}

      {/* 3. Tu propio perfil (Session Storage) */}
      <ProfileScreen
          isOpen={showProfileScreen}
          username={username} // Tu sesión activa
          onClose={() => setShowProfileScreen(false)}
      />

      <TutorialScreen
        isOpen={showTutorialScreen}
        onClose={() => setShowTutorialScreen(false)}
      />

      {showSettings && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Configuración de elementos de fondo">
          <div className="modal-box">
            <h3>Configuración de elementos de fondo</h3>
            <div className="form-group">
              <label htmlFor="music-volume">Volumen de la música</label>
              <input
                id="music-volume"
                className="form-input"
                type="range"
                min="0"
                max="100"
                value={Math.round(musicVolume * 100)}
                onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="video-static">Video en movimiento</label>
              <input
                id="video-static"
                type="checkbox"
                checked={!isVideoPaused}
                onChange={(e) => setIsVideoPaused(!e.target.checked)}
              />
            </div>
            <button type="button" className="submit-button settings-close-button" onClick={() => setShowSettings(false)}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Renderizado directo al root
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GameApp />
  </React.StrictMode>
);

export { GameApp };
