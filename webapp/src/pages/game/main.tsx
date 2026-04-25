import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { useTranslation } from 'react-i18next';

import '../../i18n.ts';
import i18n from '../../i18n';

import GameScreen from '../../screens/GameScreen';
import { HistoryModal } from '../../components/modals/HistoryModal';
import { ResultModal } from '../../components/modals/ResultModal';
import { SelectionModals } from '../../components/modals/SelectionModals';
import { PublicProfileModal } from '../../components/modals/PublicProfileModal';
import { GuestAccessModal, type GuestAccessReason } from '../../components/modals/GuestAccessModal';
import { ProfileScreen } from '../../screens/ProfileScreen';
import { TutorialScreen } from '../../screens/TutorialScreen';
import { MenuBackgroundChrome } from '../../components/layout/MenuBackgroundChrome';
import { PayPalStore } from '../../components/modals/PayPalStore';
import { FriendsPanel } from '../../components/modals/FriendsPanel';

import { useMenuBackgroundMedia } from '../../hooks/useMenuBackgroundMedia';
import { useGameLogic } from '../../hooks/useGameLogic';
import { useGameTimer } from '../../hooks/useGameTimer';
import { gameService } from '../../services/gameService';
import { getBoardDimensionFromSizeChoice } from '../../utils/boardUtils';
import { getGameIdentity, mapUiDifficultyToBackend, resolveIconFromAssets } from '../../utils/gamePageUtils';
import { clearGuestSession, isGuestSession } from '../../utils/sessionUtils';
import { resolveBoardLabel, resolveHistoryLocale, resolveTurnTimeLimit } from './gameMainHelpers';

import '../../css/App.css';
import '../../css/Game.css';
import '../../css/Log.css';
import '../../index.css';

import type { DifficultyChoice, SizeChoice, HistoryGameRecord } from '../../types/game';

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
  const { t } = useTranslation();
  const { displayName, friendCode, username } = getGameIdentity(isGuestMode, storedUsername);
  const [playerIcon, setPlayerIcon] = useState(resolveIconFromAssets(isGuestMode ? null : localStorage.getItem('yovi_user_icon'), iconModules));
  const [botIcon] = useState<string | null>(() => pickRandomBotIcon());
  const handleAutoMoveRef = useRef<() => Promise<void> | void>(() => {});
  const handleTimeUp = useCallback(() => {
    void handleAutoMoveRef.current();
  }, []);

  const [difficultyChoice, setDifficultyChoice] = useState<DifficultyChoice | null>('Fácil');
  const [sizeChoice, setSizeChoice] = useState<SizeChoice | null>('Pequeño');
  const [previousDifficultyChoice, setPreviousDifficultyChoice] = useState<DifficultyChoice | null>('Easy');
  const [previousSizeChoice, setPreviousSizeChoice] = useState<SizeChoice | null>('Pequeño');
  const [availableDifficulties, setAvailableDifficulties] = useState<string[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showFriendsMenu, setShowFriendsMenu] = useState(false);
  const [showProfileScreen, setShowProfileScreen] = useState(false);
  const [showTutorialScreen, setShowTutorialScreen] = useState(false);
  const [publicProfileToView, setPublicProfileToView] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [showStore, setShowStore] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [historyData, setHistoryData] = useState<HistoryGameRecord[]>([]);
  const [historyFilter, setHistoryFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [guestAccessReason, setGuestAccessReason] = useState<GuestAccessReason | null>(null);
  const background = useMenuBackgroundMedia();
  const historyLocale = resolveHistoryLocale(i18n.resolvedLanguage, i18n.language);
  const resolvedBoardLabel = resolveBoardLabel(sizeChoice, t);

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
    setGameStarted(false);
    void resetGame(size, difficulty);
  }, [resetGame, stopTimer, setTimerVisible]);

  useEffect(() => {
    gameService.getDifficulties()
      .then(setAvailableDifficulties)
      .catch((err) => console.error('Error API:', err));

    queueMicrotask(() => {
      startNewGame(6, 'Easy');
    });
  }, [startNewGame]);

  useEffect(() => {
    let active = true;

    const syncProfileData = async () => {
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

        const languageToI18n: Record<string, string> = {
          Spain: 'es',
          English: 'en',
          German: 'de',
          Portuguese: 'pt',
        };
        if (profile?.language) {
          i18n.changeLanguage(languageToI18n[profile.language] ?? 'es');
        }

        const scoreReal = profile.totalScore ?? profile.stats?.totalScore ?? 0;
        setTotalScore(scoreReal);
      } catch {
        // Mantenemos el estado local si falla la petición.
      }
    };

    syncProfileData();
    return () => {
      active = false;
    };
  }, [username]);

  const handleAutoMove = useCallback(async () => {
    try {
      const data = await executeAutoMove(difficultyChoice!, startTimer, {
        boardLabel: resolvedBoardLabel,
        locale: historyLocale,
      });
      if (data?.winner !== null) setShowResultModal(true);
    } catch {}
  }, [difficultyChoice, executeAutoMove, historyLocale, resolvedBoardLabel, startTimer]);

  useEffect(() => {
    handleAutoMoveRef.current = handleAutoMove;
  }, [handleAutoMove]);

  const handleCellClick = async (index: number) => {
    if (winner !== null) return;
    try {
      if (!gameStarted) {
        setGameStarted(true);
      }
      const data = await executeHumanMove(index, difficultyChoice!, stopTimer, startTimer, {
        boardLabel: resolvedBoardLabel,
        locale: historyLocale,
      });
      if (data.winner !== null) {
        setTimerVisible(false);
        setFinalScore(data.score || 0);
        if (data.winner === 0) {
          setTotalScore(prev => prev + (data.score || 0));
        }
        setShowResultModal(true);
      }
    } catch {}
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

  const openGuestAccessPrompt = (reason: GuestAccessReason) => {
    setGuestAccessReason(reason);
  };

  return (
    <MenuBackgroundChrome
      audioRef={background.audioRef}
      isVideoPaused={background.isVideoPaused}
      musicVolume={background.musicVolume}
      setIsVideoPaused={background.setIsVideoPaused}
      setMusicVolume={background.setMusicVolume}
      setShowSettings={background.setShowSettings}
      showSettings={background.showSettings}
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
        totalScore={totalScore}
        gameStarted={gameStarted}
        turnTimeLeft={turnTimeLeft}
        timerVisible={timerVisible}
        turnTimeLimit={resolveTurnTimeLimit(difficultyChoice)}
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
          await surrender(difficultyChoice!, {
            boardLabel: resolvedBoardLabel,
            locale: historyLocale,
            resultLabel: t('game.you_lose'),
          });
          setFinalScore(0);
          setShowResultModal(true);
        }}
        onAddFriend={() => (isGuestMode ? openGuestAccessPrompt('amigos') : setShowFriendsMenu(true))}
        onViewProfile={() => (isGuestMode ? openGuestAccessPrompt('perfil') : setShowProfileScreen(true))}
        onOpenSettings={() => background.setShowSettings(true)}
        onOpenTutorial={() => setShowTutorialScreen(true)}
        onScoreButtonClick={() => setShowStore(true)}
      />

      <PayPalStore
        isOpen={showStore}
        onClose={() => setShowStore(false)}
        onSuccess={async (puntos) => {
          setTotalScore(prev => prev + puntos);
          try {
            await gameService.addXP(puntos);
            console.log('Compra guardada en el servidor');
          } catch (err) {
            console.error('No se pudo guardar la compra:', err);
          }
        }}
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
        onFilterChange={(f) => {
          setHistoryFilter(f);
          fetchHistory(1, f);
        }}
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
          setGuestAccessReason(null);
          globalThis.location.href = '/login.html';
        }}
        onGoRegister={() => {
          setGuestAccessReason(null);
          globalThis.location.href = '/register.html';
        }}
      />
    </MenuBackgroundChrome>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GameApp />
  </React.StrictMode>
);

export { GameApp, GameAppContent };


