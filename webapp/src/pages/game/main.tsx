import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
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
import { GuestAccessModal, type GuestAccessReason } from '../../components/modals/GuestAccessModal';
import { ProfileScreen } from '../../screens/ProfileScreen';
import { TutorialScreen } from '../../screens/TutorialScreen';
import { PayPalStore } from '../../components/modals/PayPalStore';

// Hooks, Servicios y Utils
import { useGameLogic } from '../../hooks/useGameLogic';
import { useGameTimer } from '../../hooks/useGameTimer';
import { MenuBackgroundShell } from '../../components/layout/MenuBackgroundShell';
import { gameService } from '../../services/gameService';
import { getBoardDimensionFromSizeChoice } from '../../utils/boardUtils';
import {TURN_TIME_LIMIT, UI_TO_ENGLISH_DIFFICULTY} from '../../constants/config';
import { clearGuestSession, isGuestSession } from '../../utils/sessionUtils';
import { getSizeLabelKey } from '../../utils/gameLabelUtils';
import { resolveIconFromAssets } from '../../utils/gamePageUtils';
import { isSupportedLanguage } from '../../utils/languageUtils';

// Assets y Estilos
import '../../css/App.css';
import '../../css/Game.css';
import '../../css/Log.css';
import '../../index.css';

// Tipos
import type { DifficultyChoice, SizeChoice, HistoryGameRecord } from '../../types/game';
import { FriendsPanel } from '../../components/modals/FriendsPanel';
import {useTranslation} from "react-i18next";
import { MultiplayerStrategy } from '../../strategies/MultiplayerStrategy';
import type { ChallengePlayerEvent, GameMode, SyncBoardEvent } from '../../types/socketEvents';
import type { RivalInfo } from '../../providers/GameProvider';

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

const paypalOptions = {
  clientId: "AWhGEvR7eqIk8FKJ_cr3OKDQy6oGHnTX0hh8DpyjQvZda66ciws-WR9tS5jnA_9FdpNY6zVj9bXKfaih",
  currency: "EUR",
  intent: "capture", 
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
  const selectedGameMode = (sessionStorage.getItem('yovi_gamemode') as GameMode | null) || (isGuestMode ? 'bot' : null);

  useEffect(() => {
    if (!storedUsername && !isGuestMode) {
      globalThis.location.href = '/index.html';
      return;
    }
    if (storedUsername && !selectedGameMode) {
      globalThis.location.href = '/gamemode.html';
    }
  }, [isGuestMode, selectedGameMode, storedUsername]);

  if ((!storedUsername && !isGuestMode) || !selectedGameMode) return null;

  return <GameAppContent gameMode={selectedGameMode} isGuestMode={isGuestMode} storedUsername={storedUsername} />;
};

type GameAppContentProps = {
  gameMode?: GameMode;
  isGuestMode: boolean;
  storedUsername: string;
};

const GameAppContent = ({ gameMode = 'bot', isGuestMode, storedUsername }: GameAppContentProps) => {
  const { t } = useTranslation()
  // --- SEGURIDAD Y SESIÓN ---
  const username = isGuestMode ? 'Invitado' : storedUsername;
  const friendCode = isGuestMode ? '' : (localStorage.getItem('yovi_friend_code') || '');
  const displayName = isGuestMode ? 'Invitado' : (localStorage.getItem('yovi_user_nickname') || username);
  const [playerIcon, setPlayerIcon] = useState(resolveUserIcon(isGuestMode ? null : localStorage.getItem('yovi_user_icon')));
  const [botIcon] = useState<string | null>(() => pickRandomBotIcon());
  const handleAutoMoveRef = useRef<() => Promise<void> | void>(() => {});
  const handleTimeUp = useCallback(() => {
    void handleAutoMoveRef.current();
  }, []);
  const [finalScore, setFinalScore] = useState<number>(0); // Nuevo estado para el puntaje final de la partida
  const [totalScore, setTotalScore] = useState<number>(0); // Nuevo estado para el puntaje total acumulado del usuario
  const [showStore, setShowStore] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [rivalInfo, setRivalInfo] = useState<RivalInfo | null>(null);
  const [pendingChallenge, setPendingChallenge] = useState<ChallengePlayerEvent | null>(null);
  const [inviteLoadingUser, setInviteLoadingUser] = useState<string | null>(null);
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
  const [publicProfileToView, setPublicProfileToView] = useState<string | null>(null);

  // --- ESTADOS DE HISTORIAL ---
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<HistoryGameRecord[]>([]);
  const [historyFilter, setHistoryFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [guestAccessReason, setGuestAccessReason] = useState<GuestAccessReason | null>(null);
  const historyLocale = (i18n.resolvedLanguage || i18n.language || 'es').split('-')[0];
  const resolvedBoardLabel = sizeChoice ? t(`game.${getSizeLabelKey(sizeChoice)}`) : null;

  // --- HOOKS DE LÓGICA ---
  const {
    boardData,
    winner,
    setBoardData,
    setWinner,
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
    setGameStarted(false);
    if (gameMode === 'multiplayer') {
      setBoardData(null);
      setWinner(null);
      setCurrentTurn(null);
      setMatchId(null);
      setRivalInfo(null);
      setShowFriendsMenu(true);
      return;
    }
    void resetGame(size, difficulty);
  }, [gameMode, resetGame, setBoardData, setTimerVisible, setWinner, stopTimer]);

  const handleMultiplayerSync = useCallback((payload: SyncBoardEvent) => {
    if (payload.error) {
      setInviteLoadingUser(null);
      alert(payload.error);
      return;
    }
    if (payload.matchId) {
      setMatchId(payload.matchId);
      multiplayerStrategyRef.current?.setMatchId(payload.matchId);
    }
    if (payload.players?.length) {
      const opponent = payload.players.find((player) => player !== username);
      if (opponent) {
        setRivalInfo((prev) => ({ name: prev?.name || opponent, icon: resolveUserIcon(prev?.icon) }));
      }
    }
    if (payload.board) {
      setBoardData(payload.board);
      setGameStarted(true);
      setShowFriendsMenu(false);
    }
    setCurrentTurn(payload.currentTurn || null);
    if (payload.winner) {
      setWinner(payload.winner === username ? 0 : 1);
      setTimerVisible(false);
      setShowResultModal(true);
    } else {
      setWinner(null);
    }
  }, [setBoardData, setTimerVisible, setWinner, username]);

  const handleChallenge = useCallback((payload: ChallengePlayerEvent) => {
    if (payload.status === 'sent') {
      setInviteLoadingUser(null);
      alert(t('friends.invite') + ' enviada');
      return;
    }
    setPendingChallenge(payload);
  }, [t]);

  const handleInviteFriend = useCallback((friendUsername: string) => {
    if (gameMode !== 'multiplayer') return;
    setInviteLoadingUser(friendUsername);
    multiplayerStrategyRef.current?.challengePlayer(friendUsername);
    globalThis.setTimeout(() => {
      setInviteLoadingUser((current) => (current === friendUsername ? null : current));
    }, 8000);
  }, [gameMode]);

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

        const syncProfileData = async () => {
            try {
                const profile = await gameService.getProfile();

                if (!active || !profile || profile.error) return;

                const rawIcon = typeof profile.iconName === 'string' ? profile.iconName : (profile.icon || '');
                const safeIconName = String(rawIcon).replaceAll(/[^a-zA-Z0-9._-]/g, '');

                const resolvedIcon = resolveIconFromAssets(safeIconName, iconModules);

                if (resolvedIcon) {
                    setPlayerIcon(resolvedIcon);
                }

                const languageToI18n: Record<string, string> = {
                    Spain: 'es',
                    English: 'en',
                    German: 'de',
                    Portuguese: 'pt',
                };

                const safeLanguage = isSupportedLanguage(profile.language) ? profile.language : null;
                if (safeLanguage) {
                    const langCode = languageToI18n[safeLanguage] ?? 'es';
                    i18n.changeLanguage(langCode);
                }

                const scoreReal = profile.totalScore ?? profile.stats?.totalScore ?? 0;
                setTotalScore(Number(scoreReal));

            } catch (err) {

                console.error("Error sincronizando los datos del perfil del usuario.");
            }
        };

        void syncProfileData();
        return () => {
            active = false;
        };
    }, []);

        // --- MANEJADORES DE ACCIONES ---
        const handleAutoMove = useCallback(async () => {
            try {
                const data = await executeAutoMove(difficultyChoice!, startTimer, {
                    boardLabel: resolvedBoardLabel,
                    locale: historyLocale,
                });
                if (data && data.winner !== null) {
                    setFinalScore(data.score || 0);

                    // SUMA OPTIMISTA: Si por algún motivo el bot nos da la victoria (ID 0)
                    if (data.winner === 0) {
                        setTotalScore(prev => prev + (data.score || 0));
                    }

                    setShowResultModal(true);
                }
            } catch {
            }
        }, [difficultyChoice, executeAutoMove, historyLocale, resolvedBoardLabel, startTimer]);

        useEffect(() => {
            handleAutoMoveRef.current = handleAutoMove;
        }, [handleAutoMove]);

        useEffect(() => {
            if (gameMode !== 'multiplayer' || isGuestMode) return;

            const strategy = new MultiplayerStrategy({
                username,
                boardSize: getBoardDimensionFromSizeChoice(sizeChoice) || 6,
                onSync: handleMultiplayerSync,
                onChallenge: handleChallenge,
                onOpponentDataFetched: (info) => setRivalInfo({name: info.name, icon: resolveUserIcon(info.icon)}),
                onPlayerDisconnected: () => {
                    setWinner(1);
                    setCurrentTurn(null);
                    setMatchId(null);
                    setTimerVisible(false);
                    alert('El rival ha salido de la partida.');
                    globalThis.location.replace('/gamemode.html');
                },
            });

            multiplayerStrategyRef.current = strategy;
            void strategy.initialize();
            setShowFriendsMenu(true);

            return () => {
                strategy.dispose();
                multiplayerStrategyRef.current = null;
            };
        }, [gameMode, handleChallenge, handleMultiplayerSync, isGuestMode, sizeChoice, username]);


        const handleCellClick = async (index: number) => {
            if (winner !== null) return;
            try {
                if (!gameStarted) {
                    setGameStarted(true);
                }
                if (gameMode === 'multiplayer') {
                    if (!matchId || currentTurn !== username) return;
                    await multiplayerStrategyRef.current?.onCellClick(index);
                    return;
                }
                const data = await executeHumanMove(index, difficultyChoice!, stopTimer, startTimer, {
                    boardLabel: resolvedBoardLabel,
                    locale: historyLocale,
                });
                if (data.winner !== null) {
                    setTimerVisible(false);
                    setFinalScore(data.score || 0);
                    // SUMA OPTIMISTA: Si ganamos (ID 0), sumamos al total de la barra
                    if (data.winner === 0) {
                        setTotalScore(prev => prev + (data.score || 0));
                    }
                    setShowResultModal(true);
                }
            } catch {
            }
        };

        const fetchHistory = async (page = 1, filter = historyFilter) => {
            try {
                const result = await gameService.getHistory(page, filter);
                setHistoryData(result.data || []);
                setTotalPages(result.total_pages || 1);
                setCurrentPage(result.page || 1);
                setShowHistory(true);
            } catch (error) {
                console.error('Error historial:', error);
            }
        };

        const handleHistoryFilterChange = (nextFilter: string) => {
            setHistoryFilter(nextFilter);
            void fetchHistory(1, nextFilter);
        };

        const openFriendsMenu = () => {
            setShowFriendsMenu(true);
        };

        const openGuestAccessPrompt = (reason: GuestAccessReason) => {
            setGuestAccessReason(reason);
        };

        return (
          <MenuBackgroundShell>
            {(background) => (
            <div className="App">
                {/* Pantalla Principal */}
                <GameScreen
                    username={username}
                    displayName={displayName}
                    playerIcon={playerIcon}
                    botIcon={botIcon}
                    gameMode={gameMode}
                    opponentDisplayName={rivalInfo?.name}
                    opponentDisplayIcon={rivalInfo?.icon}
                    isPlayerTurn={gameMode !== 'multiplayer' || (Boolean(matchId) && currentTurn === username && winner === null)}
                    isOpponentTurn={gameMode === 'multiplayer' && Boolean(matchId) && currentTurn !== username && winner === null}
                    boardData={boardData}
                    winner={winner}
                    difficultyChoice={difficultyChoice}
                    selectedBoardDimension={getBoardDimensionFromSizeChoice(sizeChoice)}
                    sizeLabel={sizeChoice}
                    totalScore={totalScore}
                    gameStarted={gameStarted}
                    turnTimeLeft={turnTimeLeft}
                    timerVisible={timerVisible}
                    turnTimeLimit={difficultyChoice ? (TURN_TIME_LIMIT[UI_TO_ENGLISH_DIFFICULTY[difficultyChoice] ?? difficultyChoice] ?? null) : null}
                    onCellClick={handleCellClick}
                    onFetchHistory={() => (isGuestMode ? openGuestAccessPrompt('historial') : fetchHistory())}
                    onExit={async () => {
                        stopTimer();
                        if (gameMode === 'multiplayer') {
                            void multiplayerStrategyRef.current?.surrender(difficultyChoice || 'Easy');
                        }
                        if (isGuestMode) {
                            clearGuestSession();
                        } else {
                            await gameService.logout().catch(() => undefined);
                        }
                        sessionStorage.clear();
                        localStorage.removeItem('yovi_user');
                        localStorage.removeItem('yovi_friend_code');
                        localStorage.removeItem('yovi_user_icon');
                        localStorage.removeItem('yovi_user_language');
                        localStorage.removeItem('yovi_user_nickname');
                        localStorage.removeItem('username');
                        globalThis.location.href = '/index.html';
                    }}
                    onChangeDifficulty={(uiDiff: string) => {
                        // 1. Mapa de traducción para el backend
                        const backendMap: Record<string, string> = {
                            'Fácil': 'facil',
                            'Medio': 'medio',
                            'Difícil': 'dificil'
                        };

                        const valueForBackend = backendMap[uiDiff] || 'facil';

                        // 2. Guardamos el valor (puedes guardar el "bonito" para la UI)
                        setDifficultyChoice(uiDiff as DifficultyChoice);
                        setPreviousDifficultyChoice(uiDiff as DifficultyChoice);

                        // 3. Llamamos al servicio con el valor que entiende el Backend
                        const dimension = getBoardDimensionFromSizeChoice(sizeChoice) || 6;
                        startNewGame(dimension, valueForBackend as DifficultyChoice);
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
                        if (gameMode === 'multiplayer') {
                            void multiplayerStrategyRef.current?.surrender(difficultyChoice || 'Easy');
                            setWinner(1);
                            setShowResultModal(true);
                            globalThis.location.replace('/gamemode.html');
                            return;
                        }
                        await surrender(difficultyChoice!, {
                            boardLabel: resolvedBoardLabel,
                            locale: historyLocale,
                            resultLabel: t('game.you_lose'),
                        });
                        setFinalScore(0);
                        setShowResultModal(true);
                    }}
                    onAddFriend={() => (isGuestMode ? openGuestAccessPrompt('amigos') : openFriendsMenu())}
                    onViewProfile={() => (isGuestMode ? openGuestAccessPrompt('perfil') : setShowProfileScreen(true))}
                    onOpenSettings={() => background.setShowSettings(true)}
                    onOpenTutorial={() => setShowTutorialScreen(true)}
                    onScoreButtonClick={() => {
                        setShowStore(true);
                    }}
                    onGoToModeMenu={() => {
                        if (winner === null && !globalThis.confirm(t('game.abandon_confirm'))) return;
                        if (gameMode === 'multiplayer') {
                            void multiplayerStrategyRef.current?.surrender(difficultyChoice || 'Easy');
                        }
                        sessionStorage.setItem('yovi_previous_gamemode', gameMode);
                        globalThis.location.replace('/gamemode.html');
                    }}
                />

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
                    winner={winner}
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
                    onFilterChange={handleHistoryFilterChange}
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
                    inviteLoadingUser={inviteLoadingUser}
                    onInviteFriend={handleInviteFriend}
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
                    onIconUpdated={(icon) => setPlayerIcon(resolveUserIcon(icon))}
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
                {pendingChallenge && (
                    <dialog className="modal-backdrop" aria-label="Invitacion multijugador" open>
                        <div className="modal-box">
                            <h3>{t('mode.multiplayer_duel')}</h3>
                            <p>{pendingChallenge.challenger} te ha invitado a una partida.</p>
                            <div className="modal-action-list">
                                <button
                                    type="button"
                                    className="submit-button"
                                    onClick={() => {
                                        multiplayerStrategyRef.current?.acceptChallenge(pendingChallenge.challengeId);
                                        setPendingChallenge(null);
                                    }}
                                >
                                    Aceptar
                                </button>
                                <button
                                    type="button"
                                    className="submit-button"
                                    onClick={() => setPendingChallenge(null)}
                                >
                                    Rechazar
                                </button>
                            </div>
                        </div>
                    </dialog>
                )}
                {background.showSettings && (
                    <dialog className="modal-backdrop" aria-label={t('game.settings_title')} open>
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
                                    value={Math.round(background.musicVolume * 100)}
                                    onChange={(e) => background.setMusicVolume(Number(e.target.value) / 100)}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="video-static">{t('game.video_moving')}</label>
                                <input
                                    id="video-static"
                                    type="checkbox"
                                    checked={!background.isVideoPaused}
                                    onChange={(e) => background.setIsVideoPaused(!e.target.checked)}
                                />
                            </div>
                            <button type="button" className="submit-button settings-close-button"
                                    onClick={() => background.setShowSettings(false)}>
                                {t('common.close')}
                            </button>
                        </div>
                    </dialog>
                )}
            </div>
            )}
          </MenuBackgroundShell>
        );

    };
// Renderizado directo al root
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PayPalScriptProvider options={paypalOptions}>
      <GameApp />
    </PayPalScriptProvider>
  </React.StrictMode>
);

export { GameApp, GameAppContent };
