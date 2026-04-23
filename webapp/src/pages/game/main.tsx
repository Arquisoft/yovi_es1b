import React, { useCallback, useEffect, useRef, useState } from 'react';
//Internacionalización
import "../../i18n.ts";
import i18n from '../../i18n'

import ReactDOM from 'react-dom/client';

// Componentes UI y Pantallas
import GameScreen from '../../screens/GameScreen';
import { HistoryModal } from '../../components/modals/HistoryModal';
import { ResultModal } from '../../components/modals/ResultModal';
import { SelectionModals } from '../../components/modals/SelectionModals';
import { PublicProfileModal } from '../../components/modals/PublicProfileModal';
import { ProfileScreen } from '../../screens/ProfileScreen';
import { TutorialScreen } from '../../screens/TutorialScreen';
import { GameModeScreen } from '../../screens/GameModeScreen';
import { PayPalStore } from '../../components/modals/PayPalStore';

// Hooks, Servicios y Utils
import { useGameLogic } from '../../hooks/useGameLogic';
import { useGameTimer } from '../../hooks/useGameTimer';
import { gameService } from '../../services/gameService';
import { getBoardDimensionFromSizeChoice } from '../../utils/boardUtils';
import {TURN_TIME_LIMIT, UI_TO_ENGLISH_DIFFICULTY} from '../../constants/config';
import {clearSession, isGuestSession} from '../../utils/sessionUtils';

// Assets y Estilos
import menuVideo from '../../assets/background_video.mp4';
import backgroundMusic from '../../assets/background_music.mp3';
import '../../css/App.css';
import '../../css/Game.css';
import '../../css/Log.css';
import '../../index.css';

// Tipos
import type { DifficultyChoice, SizeChoice, HistoryGameRecord, GameYData } from '../../types/game';
import type { ChallengePlayerEvent, GameMode, SyncBoardEvent } from '../../types/socketEvents';
import { FriendsPanel } from '../../components/modals/FriendsPanel';
import {useTranslation} from "react-i18next";
import { BotStrategy } from '../../strategies/BotStrategy';
import { MultiplayerStrategy } from '../../strategies/MultiplayerStrategy';
import type { GameProvider } from '../../providers/GameProvider';
import { getSocketClient } from '../../services/socketClient';

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
  //const index = Math.floor(Math.random() * pool.length);
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const index = array[0] % pool.length;
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
  useEffect(() => {
    const storedLang = localStorage.getItem('yovi_user_language') || 'es';
    const langMap: Record<string, string> = {
      'Spain': 'es', 'English': 'en', 'German': 'de', 'Portuguese': 'pt',
    };
    void i18n.changeLanguage(langMap[storedLang] ?? storedLang);
  }, []);


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
  const { t } = useTranslation()
  // --- SEGURIDAD Y SESIÓN ---
  const username = isGuestMode ? 'Invitado' : storedUsername;
  const friendCode = isGuestMode ? '' : (localStorage.getItem('yovi_friend_code') || '');
  const displayName = isGuestMode ? 'Invitado' : (localStorage.getItem('yovi_user_nickname') || username);
  const [playerIcon, setPlayerIcon] = useState(resolveUserIcon(isGuestMode ? null : localStorage.getItem('yovi_user_icon')));
  const [botIcon, setBotIcon] = useState<string | null>(() => pickRandomBotIcon());
  const handleAutoMoveRef = useRef<() => Promise<void> | void>(() => {});
  const handleTimeUp = useCallback(() => {
    void handleAutoMoveRef.current();
  }, []);
  const [finalScore, setFinalScore] = useState<number>(0); // Nuevo estado para el puntaje final de la partida
  const [totalScore, setTotalScore] = useState<number>(0); // Nuevo estado para el puntaje total acumulado del usuario
   const [showStore, setShowStore] = useState(false);
   const [gameMode, setGameMode] = useState<GameMode | null>(() => {
     // Leer el modo de juego guardado en sessionStorage
     const savedMode = sessionStorage.getItem('yovi_gamemode') as GameMode | null;
     return savedMode || null;
   });
   const [inviteLoadingUser, setInviteLoadingUser] = useState<string | null>(null);
   const [incomingChallenge, setIncomingChallenge] = useState<ChallengePlayerEvent | null>(null);
   const [multiplayerBoard, setMultiplayerBoard] = useState<GameYData | null>(null);
   const [multiplayerWinner, setMultiplayerWinner] = useState<number | null>(null);
   const [multiplayerMatchId, setMultiplayerMatchId] = useState<string | null>(null);
   const [multiplayerTurn, setMultiplayerTurn] = useState<string | null>(null);
   const [socketConnection, setSocketConnection] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
   const [rivalName, setRivalName] = useState<string | null>(null);
   const [rivalIcon, setRivalIcon] = useState<string | null>(null);
   const providerRef = useRef<GameProvider | null>(null);
   const multiplayerStrategyRef = useRef<MultiplayerStrategy | null>(null);

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

  const handleSyncBoard = useCallback((payload: SyncBoardEvent) => {
    if (payload.error) {
      console.error('Socket sync error:', payload.error);
      return;
    }
    if (payload.matchId) {
      setMultiplayerMatchId(payload.matchId);
      multiplayerStrategyRef.current?.setMatchId(payload.matchId);
    }
    if (payload.board) {
      setMultiplayerBoard(payload.board);
    }
    if (payload.currentTurn) {
      setMultiplayerTurn(payload.currentTurn);
    }
    if (typeof payload.winner === 'string') {
      setMultiplayerWinner(payload.winner === username ? 0 : 1);
      setShowResultModal(true);
    }
  }, [username]);

  const handleIncomingChallenge = useCallback((payload: ChallengePlayerEvent) => {
    if (payload.status === 'sent') return;
    setIncomingChallenge(payload);
  }, []);

  useEffect(() => {
    if (gameMode !== 'bot') return;
    const socket = getSocketClient();
    socket.on('challenge_player', handleIncomingChallenge);
    return () => {
      socket.off('challenge_player', handleIncomingChallenge);
    };
  }, [gameMode, handleIncomingChallenge]);

   const boardDataRef = useRef(boardData);
   useEffect(() => {
     boardDataRef.current = boardData;
   }, [boardData]);

   const difficultyChoiceRef = useRef(difficultyChoice);
   useEffect(() => {
     difficultyChoiceRef.current = difficultyChoice;
   }, [difficultyChoice]);

   useEffect(() => {
     if (!gameMode) return;

     providerRef.current?.dispose();

     if (gameMode === 'bot') {
       setRivalName(null);
       setRivalIcon(null);
       const botProvider = new BotStrategy({
         getBoard: () => boardDataRef.current,
         getDifficulty: () => String(difficultyChoiceRef.current || 'Easy'),
         executeHumanMove,
         resetGame,
         surrenderGame: surrender,
         startTimer,
         stopTimer,
         onBoardUpdate: () => {},
       });
       providerRef.current = botProvider;
       multiplayerStrategyRef.current = null;
       void botProvider.initialize();
       return;
     }

     // Reset rival info when entering multiplayer mode
     setRivalName(null);
     setRivalIcon(null);

     const strategy = new MultiplayerStrategy({
       username,
       boardSize: getBoardDimensionFromSizeChoice(sizeChoice) || 6,
       onSync: handleSyncBoard,
       onChallenge: handleIncomingChallenge,
       onOpponentDataFetched: (rivalInfo) => {
         setRivalName(rivalInfo.name || null);
         setRivalIcon(rivalInfo.icon || null);
       },
     });
     providerRef.current = strategy;
     multiplayerStrategyRef.current = strategy;
     void strategy.initialize();

     const socket = getSocketClient();
     if (socket.connected) {
       setSocketConnection('connected');
     }
     const onConnect = () => setSocketConnection('connected');
     const onDisconnect = () => {
       setSocketConnection('disconnected');
       setRivalName(null);
       setRivalIcon(null);
     };
     const onReconnectAttempt = () => setSocketConnection('connecting');
     socket.on('connect', onConnect);
     socket.on('disconnect', onDisconnect);
     socket.io.on('reconnect_attempt', onReconnectAttempt);

     return () => {
       strategy.dispose();
       socket.off('connect', onConnect);
       socket.off('disconnect', onDisconnect);
       socket.io.off('reconnect_attempt', onReconnectAttempt);
     };
   }, [
     executeHumanMove,
     gameMode,
     handleIncomingChallenge,
     handleSyncBoard,
     resetGame,
     sizeChoice,
     startTimer,
     stopTimer,
     surrender,
     username,
   ]);

  const startNewGame = useCallback((size: number, difficulty: DifficultyChoice) => {
    stopTimer();
    setTimerVisible(false);
    setBotIcon(pickRandomBotIcon());
    void resetGame(size, difficulty);
  }, [resetGame, stopTimer, setTimerVisible, setBotIcon]);

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
  }, [startNewGame]);

  useEffect(() => {
    if (gameMode !== 'bot') return;
    queueMicrotask(() => {
      void startNewGame(6, 'Easy');
    });
  }, [gameMode, startNewGame]);

  useEffect(() => {
      let active = true;
      const syncProfileData = async () => {
          try {
              const profile = await gameService.getProfile();
              if (!active || profile?.error) return;

              // Sincronizar icono
              const resolvedIcon = resolveUserIcon(profile.iconName || profile.icon);
              if (resolvedIcon){
                 setPlayerIcon(resolvedIcon);
                localStorage.setItem('yovi_user_icon', resolvedIcon);
              }
                //para internacionalización
                const languageToI18n: Record<string, string> = {
                  'Spain': 'es', 'English': 'en', 'German': 'de', 'Portuguese': 'pt',
                }
                if (profile?.language) {
                  void i18n.changeLanguage(languageToI18n[profile.language] ?? 'es')
                }

              // --- NUEVO: Sincronizar puntos totales ---
              const scoreReal = profile.totalScore ?? profile.stats?.totalScore ?? 0;
              setTotalScore(scoreReal);

          } catch (error) {
            console.error('Error sincronizando perfil:', error);
          }
      };
      void syncProfileData();
      return () => { active = false; };
  }, [username]);

  // --- MANEJADORES DE ACCIONES ---
  const handleAutoMove = useCallback(async () => {
    if (gameMode !== 'bot') return;
    try {
      const data = await executeAutoMove(difficultyChoice!, startTimer);
      if (data && data.winner !== null) {
        setFinalScore(data.score || 0);

        // SUMA OPTIMISTA: Si por algún motivo el bot nos da la victoria (ID 0)
        if (data.winner === 0) {
          setTotalScore(prev => prev + (data.score || 0));
        }

        setShowResultModal(true);
      }
    } catch (error) {
      console.error('Error en movimiento automatico:', error);
    }
  }, [difficultyChoice, executeAutoMove, gameMode, startTimer]);

  useEffect(() => {
    handleAutoMoveRef.current = handleAutoMove;
  }, [handleAutoMove]);


  const handleCellClick = async (index: number) => {
    console.log("🛠️ [handleCellClick] INTENTO DE CLICK:", { index, gameMode, socketConnection, multiplayerTurn, username, winner, multiplayerWinner });
    if (gameMode === 'bot' && winner !== null) return;
    if (gameMode === 'multiplayer' && multiplayerWinner !== null) return;
    if (gameMode === 'multiplayer' && multiplayerTurn !== username) {
      console.warn("🚫 [handleCellClick] BLOQUEADO POR CLIENTE (Turno incorrecto):", { multiplayerTurn, username });
      return;
    }

    try {
      console.log("✅ [handleCellClick] ENVIANDO MOVIMIENTO A PROVIDER");
      const data = await providerRef.current?.onCellClick(index);
      if (!data) return;
      if (data.winner !== null) {
        setTimerVisible(false);
        setFinalScore(data.score || 0);
        if (data.winner === 0 && gameMode === 'bot') {
          setTotalScore(prev => prev + (data.score || 0));
        }
        setShowResultModal(true);
      }
    } catch (error) {
      console.error('Error en movimiento:', error);
    }
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

  const handleSelectMode = (mode: GameMode) => {
    if (mode === 'multiplayer' && isGuestMode) {
      setGameMode('bot');
      setSocketConnection('disconnected');
      return;
    }
    setGameMode(mode);
    if (mode === 'multiplayer') {
      setSocketConnection('connecting');
      stopTimer();
      setTimerVisible(false);
      setShowFriendsMenu(true);
    } else {
      setSocketConnection('disconnected');
    }
  };

  const handleInviteFriend = (friendUsername: string) => {
    if (gameMode !== 'multiplayer') return;
    setInviteLoadingUser(friendUsername);
    multiplayerStrategyRef.current?.challengePlayer(friendUsername);
    window.setTimeout(() => setInviteLoadingUser(null), 800);
  };

  const handleAcceptChallenge = () => {
    if (!incomingChallenge) return;
    const socket = getSocketClient();

    // Al aceptar una invitacion desde IA se abandona el progreso local actual.
    stopTimer();
    setTimerVisible(false);
    setMultiplayerBoard(null);
    setMultiplayerWinner(null);
    setMultiplayerTurn(null);
    setMultiplayerMatchId(null);
    setSocketConnection('connecting');
    setGameMode('multiplayer');
    socket.emit('accept_challenge', { challengeId: incomingChallenge.challengeId });
    setIncomingChallenge(null);
  };

  const handleRejectChallenge = () => {
    setIncomingChallenge(null);
  };

  const handleGoToModeMenu = () => {
    const canLoseProgress = gameMode === 'bot' && winner === null;
    if (canLoseProgress) {
      const confirmed = window.confirm('Si cambias de modo perderas el progreso actual de la partida IA. ¿Quieres continuar?');
      if (!confirmed) return;
    }
    stopTimer();
    setTimerVisible(false);
    sessionStorage.removeItem('yovi_gamemode');
    window.location.replace('/gamemode.html');
  };

  const activeBoardData = gameMode === 'multiplayer' ? multiplayerBoard : boardData;
  const activeWinner = gameMode === 'multiplayer' ? multiplayerWinner : winner;

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
        gameMode={gameMode}
        rivalName={rivalName}
        rivalIcon={rivalIcon}
        boardData={activeBoardData}
        winner={activeWinner}
        multiplayerTurn={multiplayerTurn}
        difficultyChoice={difficultyChoice}
        selectedBoardDimension={getBoardDimensionFromSizeChoice(sizeChoice)}
        sizeLabel={sizeChoice}
        totalScore={totalScore}
        turnTimeLeft={turnTimeLeft}
        timerVisible={gameMode === 'bot' ? timerVisible : false}
        turnTimeLimit={difficultyChoice ? (TURN_TIME_LIMIT[UI_TO_ENGLISH_DIFFICULTY[difficultyChoice] ?? difficultyChoice] ?? null) : null}
        onCellClick={handleCellClick}
        onFetchHistory={() => void fetchHistory()}
        onExit={handleExit}
        onChangeDifficulty={(uiDiff: string) => {
          if (gameMode !== 'bot') return;
          // 1. Mapa de traducción para el backend
          const backendMap: Record<string, string> = {
            'Fácil': 'facil',
            'Medio': 'medio',
            'Difícil': 'dificil'
          };

          const valueForBackend = backendMap[uiDiff] || 'facil';

          // 2. Guardamos el valor (puedes guardar el "bonito" para la UI)
          const uiDiffChoice = uiDiff as DifficultyChoice;
          setDifficultyChoice(uiDiffChoice);
          setPreviousDifficultyChoice(uiDiffChoice);
          
          // 3. Llamamos al servicio con el valor que entiende el Backend
          const dimension = getBoardDimensionFromSizeChoice(sizeChoice) || 6;
          startNewGame(dimension, valueForBackend as DifficultyChoice);
        }}
        onChangeSize={(newSize: SizeChoice) => {
          setPreviousSizeChoice(newSize);
          setSizeChoice(newSize);
          if (gameMode !== 'bot') return;
          const dimension = getBoardDimensionFromSizeChoice(newSize) || 6;
          startNewGame(dimension, difficultyChoice || 'Easy');
        }}
        onResetGame={() => {
          if (gameMode !== 'bot') return;
          startNewGame(getBoardDimensionFromSizeChoice(sizeChoice) || 6, difficultyChoice || 'Easy');
        }}
        onEndGame={async () => {
          stopTimer();
          setTimerVisible(false);
          if (gameMode === 'bot') {
            await surrender(difficultyChoice!);
          }
          setFinalScore(0);
          setShowResultModal(true);
        }}
        onAddFriend={() => openFriendsMenu()}
        onViewProfile={() => setShowProfileScreen(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenTutorial={() => setShowTutorialScreen(true)}
        onScoreButtonClick={() => {
          setShowStore(true);
        }}
        onGoToModeMenu={handleGoToModeMenu}
      />

      {!gameMode && <GameModeScreen onSelectMode={handleSelectMode} onLogout={handleExit} />}

      {gameMode === 'multiplayer' && (
        <div className="match-info-floating" aria-live="polite">
          <div className="match-info-box">
            <strong className="match-info-title">Multijugador</strong>
            <div className="match-info-line">Conexion: {socketConnection}</div>
            <div className="match-info-line">Partida: {multiplayerMatchId || 'esperando rival'}</div>
            <div className="match-info-line">Turno: {multiplayerTurn || '-'}</div>
          </div>
        </div>
      )}

      {incomingChallenge && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Invitacion de partida">
          <div className="modal-box">
            <h3>Invitacion de partida</h3>
            <p>{incomingChallenge.challenger} te ha retado a una partida 1vs1.</p>
            {gameMode === 'bot' && winner === null && (
              <p style={{ marginTop: '0.5rem', fontWeight: 600, color: '#9f1239' }}>
                Te estan invitando a una partida multijugador. Si aceptas, perderas el progreso de la partida actual contra la IA.
              </p>
            )}
            <div className="modal-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button type="button" className="submit-button" onClick={handleAcceptChallenge}>Aceptar</button>
              <button type="button" className="submit-button" onClick={handleRejectChallenge}>Rechazar</button>
            </div>
          </div>
        </div>
      )}

      <PayPalStore
        isOpen={showStore}
        onClose={() => setShowStore(false)}
        onSuccess={async (puntos) => {
          // 1. Suma visual inmediata
          setTotalScore(prev => prev + puntos);

          // 2. Guardado real en base de datos
          try {
            await gameService.addXP(puntos);
            console.log("Compra guardada en el servidor");
          } catch (err) {
            console.error("No se pudo guardar la compra:", err);
          }
        }}
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
        winner={activeWinner}
        score={finalScore}
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
        onFilterChange={(f) => { setHistoryFilter(f); void fetchHistory(1, f); }}
      />

      {/* 1. Panel de Amigos: el emisor del evento */}
      <FriendsPanel
          isOpen={showFriendsMenu}
          onClose={() => setShowFriendsMenu(false)}
          username={username} // Tu sesión
          displayName={displayName}
          friendCode={friendCode}
          icon={playerIcon}
          onInviteFriend={gameMode === 'multiplayer' ? handleInviteFriend : undefined}
          inviteLoadingUser={inviteLoadingUser}
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
            <h3>{t('game.settings_title')}</h3>
            <div className="form-group">
              <label htmlFor="music-volume">{t('game.music_volume')}</label>
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
              <label htmlFor="video-static">{t('game.video_moving')}</label>
              <input
                id="video-static"
                type="checkbox"
                checked={!isVideoPaused}
                onChange={(e) => setIsVideoPaused(!e.target.checked)}
              />
            </div>
            <button type="button" className="submit-button settings-close-button" onClick={() => setShowSettings(false)}>
              {t('common.close')}
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
