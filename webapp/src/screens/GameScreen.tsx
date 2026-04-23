import { useEffect, useRef, useState } from 'react';
import failedJson from '../assets/buttons/Failed.json';
import logoutJson from '../assets/buttons/Logout.json';
import historyJson from '../assets/buttons/History.json';
import restartJson from '../assets/buttons/Restart.json';
import settingsJson from '../assets/buttons/setting.json';
import settingsImg from '../assets/buttons/configuracion.png';
import botonRojo from '../assets/buttons/BotonRojo.png';
import historialImg from '../assets/buttons/Historial.jpg';
import reiniciarPartidaImg from '../assets/buttons/ReiniciarPartida.jpg';
import salirMenuImg from '../assets/buttons/SalirMenu.jpg';
import defaultAvatar from '../assets/icon/SinAvatar.png';
import amigosImg from '../assets/buttons/agregar-usuario.png';
import Lottie, { type LottieRefCurrentProps } from 'lottie-react';
import { type DifficultyChoice, type SizeChoice, SIZE_OPTIONS } from '../types/game';
import { useTranslation } from 'react-i18next';
import { OpponentCard } from '../components/game/OpponentCard';
import { OpponentState } from '../types/opponent';

interface GameYData {
  size: number;
  turn: number;
  players: string[];
  layout: string;
}

const getCellClassName = (cell: string): string => {
  if (cell === 'B') return 'blue';
  if (cell === 'R') return 'red';
  return 'empty';
};

const getCellStatusLabel = (cell: string): string => {
  if (cell === 'B') return 'ocupada por azul';
  if (cell === 'R') return 'ocupada por rojo';
  return 'vacia';
};

type GameScreenProps = Readonly<{
  username: string;
  displayName?: string;
  playerIcon?: string | null;
  botIcon?: string | null;
  gameMode?: 'bot' | 'multiplayer' | null;
  rivalName?: string | null;
  rivalIcon?: string | null;
  difficultyChoice: DifficultyChoice | null;
  selectedBoardDimension: number | null;
  boardData: GameYData | null;
  winner: number | null;
  multiplayerTurn?: string | null;
  turnTimeLeft: number | null;
  turnTimeLimit: number | null;
  timerVisible: boolean;
  sizeLabel: string | null;
  totalScore: number; // Nuevo prop para el puntaje total acumulado del usuario
  onCellClick: (index: number) => void; // Envia un movimiento al backend
  onEndGame: () => void; // Termina la partida actual
  onResetGame: () => void; // Reinicia partida
  onExit: () => void; // Sale del juego y vuelve a home
  onChangeDifficulty: (newDiff: DifficultyChoice) => void; // Permite cambiar la dificultad durante la partida
  onChangeSize: (newSize: SizeChoice) => void; // Permite cambiar el tamaño durante la partida
  onFetchHistory: () => void; // Permite consultar el historial de partidas
  onAddFriend?: () => void; // Abre el panel de amigos
  onViewProfile?: () => void; // Abre el perfil del usuario
  onOpenSettings?: () => void; // Abre el panel de configuracion
  onOpenTutorial?: () => void; // Abre la pantalla de tutorial
  onScoreButtonClick?: () => void; // Nuevo callback para cuando se hace clic en el puntaje total acumulado
  onGoToModeMenu?: () => void; // Vuelve al selector IA/Multijugador
}>;

function GameScreen({
  username,
  displayName,
  playerIcon,
  botIcon,
  gameMode,
  rivalName,
  rivalIcon,
  difficultyChoice,
  selectedBoardDimension,
  boardData,
  winner,
  multiplayerTurn,
  turnTimeLeft,
  turnTimeLimit,
  timerVisible,
  sizeLabel,
  totalScore,
  onCellClick,
  onEndGame,
  onResetGame,
  onExit,
  onChangeDifficulty,
  onChangeSize,
  onFetchHistory,
  onAddFriend,
  onViewProfile,
  onOpenSettings,
  onOpenTutorial,
  onScoreButtonClick,
  onGoToModeMenu,
}: GameScreenProps) {
  const { t } = useTranslation();
  const failedLottieRef = useRef<LottieRefCurrentProps | null>(null);
  const logoutLottieRef = useRef<LottieRefCurrentProps | null>(null);
  const historyLottieRef = useRef<LottieRefCurrentProps | null>(null);
  const updownLottieRef = useRef<LottieRefCurrentProps | null>(null);
  const restartLottieRef = useRef<LottieRefCurrentProps | null>(null);
  const difficultyLottieRef = useRef<LottieRefCurrentProps | null>(null);
  const settingsLottieRef = useRef<LottieRefCurrentProps | null>(null);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [showDiffMenu, setShowDiffMenu] = useState(false);
  const isBotMode = gameMode === 'bot';

  useEffect(() => {
    if (isBotMode) return;
    setShowSizeMenu(false);
    setShowDiffMenu(false);
  }, [isBotMode]);

  useEffect(() => {
    failedLottieRef.current?.setSpeed(0.5);
    logoutLottieRef.current?.setSpeed(0.5);
    historyLottieRef.current?.setSpeed(0.5);
    updownLottieRef.current?.setSpeed(0.5);
    restartLottieRef.current?.setSpeed(0.5);
    difficultyLottieRef.current?.setSpeed(0.5);
    settingsLottieRef.current?.setSpeed(0.5);
  }, []);

  useEffect(() => {
    const closeDropdowns = () => {
      setShowSizeMenu(false);
      setShowDiffMenu(false);
    };

    const handlePointerOutsideDropdown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      const insideDropdown = target.closest('.custom-dropdown-container');
      if (!insideDropdown) closeDropdowns();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDropdowns();
    };

    document.addEventListener('pointerdown', handlePointerOutsideDropdown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handlePointerOutsideDropdown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Etiqueta para la UI: Directa, sin diccionarios extra aquí para no liarnos
  const difficultyLabel = difficultyChoice || 'Sin seleccionar';
  const difficultyOptions: DifficultyChoice[] = ['Fácil', 'Medio', 'Difícil'];

  // Nombre del Bot: Dinámico según lo que recibimos
  const botName = difficultyLabel === 'Sin seleccionar'
    ? 'Bot Player'
    : `Bot Player (${difficultyLabel})`;

  const boardDimension = boardData?.size ?? selectedBoardDimension ?? 6;
  const safePlayerIcon = playerIcon?.trim() ? playerIcon : defaultAvatar;
  const playerLabel = displayName?.trim() ? displayName : username;

  const rawLayout = boardData?.layout ?? '';
  const expectedTotalCells = (boardDimension * (boardDimension + 1)) / 2;
  const flatCells = rawLayout.replaceAll('/', '');
  const normalizedFlatCells = flatCells.padEnd(expectedTotalCells, '.').slice(0, expectedTotalCells);
  const hasRealCellAtIndex = (index: number) => index < expectedTotalCells;
  const rowStartIndex = (rowIndex: number) => (rowIndex * (rowIndex + 1)) / 2;
  const rawRows = rawLayout ? rawLayout.split('/') : [];
  const rows =
    // Usa filas del backend si vienen en formato YEN; si no, las reconstruye desde el layout plano.
    rawRows.length === boardDimension
      ? rawRows.map((row, rowIndex) => {
          const expectedLength = rowIndex + 1;
          return row.padEnd(expectedLength, '.').slice(0, expectedLength);
        })
      : Array.from({ length: boardDimension }, (_, rowIndex) => {
          const start = (rowIndex * (rowIndex + 1)) / 2;
          const end = start + rowIndex + 1;
          return normalizedFlatCells.slice(start, end);
        });

  return (
    <div className="game-screen">

      {/* Barra de navegación superior */}

      

      <nav className="game-navbar">

        <button className="nav-btn nav-btn-icon-frame nav-btn" onClick={onViewProfile} title={t('game.profile')}>
          <img className="nav-btn-profile-img" src={safePlayerIcon} alt={t('game.profile')} />
        </button>

        <div className="nav-user-info">
          <h2>{t('game.player')} <span>{username}</span></h2>
        </div>

        {/* --- BOTÓN DE PUNTOS CENTRAL --- */}
        <div className="nav-center-score">
            <button className="score-badge-button" onClick={onScoreButtonClick}>
                <span className="score-star">★</span>
                <span className="score-text">{totalScore.toLocaleString()} XP</span>
            </button>
        </div>

        <div className="nav-center-title">{t('game.title')}</div>

        <div className="nav-game-settings">
          {/* MENÚ TAMAÑO */}
          <div className="custom-dropdown-container">
            <button 
              className={`dropdown-trigger ${showSizeMenu ? 'active' : ''}`}
              onClick={() => {
                if (!isBotMode) return;
                setShowSizeMenu(!showSizeMenu);
                setShowDiffMenu(false);
              }}
              disabled={!isBotMode}
              title={!isBotMode ? 'Solo disponible en modo IA' : t('game.change_size')}
            >
              {t('game.change_size')} ▾
            </button>
            
            {showSizeMenu && (
              <div className="dropdown-floating-list">
                {SIZE_OPTIONS.map((option) => (
                  <button
                    key={option} 
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      onChangeSize(option);
                      setShowSizeMenu(false);
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* MENÚ DIFICULTAD */}
          <div className="custom-dropdown-container">
            <button 
              className={`dropdown-trigger ${showDiffMenu ? 'active' : ''}`}
              onClick={() => {
                if (!isBotMode) return;
                setShowDiffMenu(!showDiffMenu);
                setShowSizeMenu(false);
              }}
              disabled={!isBotMode}
              title={!isBotMode ? 'Solo disponible en modo IA' : t('game.difficulty')}
            >
              {t('game.difficulty')}: {difficultyLabel} ▾
            </button>
            
            {showDiffMenu && (
              <div className="dropdown-floating-list">
                {difficultyOptions.map((diff) => (
                  <button
                    key={diff} 
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      onChangeDifficulty(diff);
                      setShowDiffMenu(false);
                    }}
                  >
                    {diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="nav-btn-spacer" aria-hidden="true" />
          <div className="nav-icon-action">
            <button className="nav-btn danger nav-btn-with-lottie" onClick={onEndGame} title={t('game.end_game')}>
              <img className="nav-btn-png" src={botonRojo} alt={t('game.end_game')} />
              <span className="nav-btn-lottie-hover" aria-hidden="true">
                <Lottie animationData={failedJson} loop autoplay lottieRef={failedLottieRef} />
              </span>
            </button>
            <span className="nav-icon-caption">{t('game.end_game')}</span>
          </div>
          <div className="nav-icon-action">
            <button className="nav-btn nav-btn-icon-frame nav-btn-with-restart" onClick={onResetGame} title={t('game.restart')}>
              <img className="nav-btn-reset-img" src={reiniciarPartidaImg} alt={t('game.restart')} />
              <span className="nav-btn-restart-hover" aria-hidden="true">
                <Lottie animationData={restartJson} loop autoplay lottieRef={restartLottieRef} />
              </span>
            </button>
            <span className="nav-icon-caption">{t('game.restart')}</span>
          </div>
          <div className="nav-icon-action">
            <button
              className="nav-btn nav-btn-icon-frame nav-btn-with-settings"
              onClick={onOpenSettings}
              title={t('game.settings')}
              aria-label={t('game.settings')}
            >
              <img className="nav-btn-settings-img" src={settingsImg} alt={t('game.settings')} />
              <span className="nav-btn-settings-hover" aria-hidden="true">
                <Lottie animationData={settingsJson} loop autoplay lottieRef={settingsLottieRef} />
              </span>
            </button>
            <span className="nav-icon-caption">{t('game.settings')}</span>
          </div>
          <div className="nav-btn-spacer" aria-hidden="true" />
          <div className="nav-icon-action">
            <button className="nav-btn nav-btn-icon-frame nav-btn-with-history" onClick={onFetchHistory} title={t('game.view_history')}>
              <img className="nav-btn-history-img" src={historialImg} alt={t('game.history')} />
              <span className="nav-btn-history-hover" aria-hidden="true">
                <Lottie animationData={historyJson} loop autoplay lottieRef={historyLottieRef} />
              </span>
            </button>
            <span className="nav-icon-caption">{t('game.history')}</span>
          </div>
          {onOpenTutorial && (
            <div className="nav-icon-action">
              <button
                className="nav-btn nav-btn-icon-frame nav-btn-with-help"
                onClick={onOpenTutorial}
                title={t('common.help_aria')}
                aria-label={t('common.help')}
              >
                <span className="nav-btn-help-glyph" aria-hidden="true">?</span>
                <span className="nav-btn-help-hover" aria-hidden="true">?</span>
              </button>
              <span className="nav-icon-caption">{t('common.help')}</span>
            </div>
          )}
          <div className="nav-icon-action">
            <button className="nav-btn nav-btn-icon-frame nav-btn" onClick={onAddFriend} title={t('game.friends_menu')}>
              <img className="nav-btn-friends-img" src={amigosImg} alt={t('game.friends_menu_short')} />
            </button>
            <span className="nav-icon-caption">{t('game.friends_menu_short')}</span>
          </div>

          <div className="nav-btn-spacer" aria-hidden="true" />
          {onGoToModeMenu && (
            <div className="nav-icon-action">
              <button
                className="nav-btn nav-btn-icon-frame nav-btn"
                onClick={onGoToModeMenu}
                title="Cambiar modo de juego"
                aria-label="Cambiar modo de juego"
              >
                Modos
              </button>
              <span className="nav-icon-caption">Modos</span>
            </div>
          )}
          <div className="nav-icon-action">
            <button className="nav-btn danger nav-btn-icon-frame nav-btn-with-logout" onClick={onExit} title={t('game.exit')}>
              <img className="nav-btn-exit-img" src={salirMenuImg} alt={t('game.exit_alt')} />
              <span className="nav-btn-logout-hover" aria-hidden="true">
                <Lottie animationData={logoutJson} loop autoplay lottieRef={logoutLottieRef} />
              </span>
            </button>
            <span className="nav-icon-caption">{t('game.exit_alt')}</span>
          </div>
        </div>

      </nav>

      {/* Contenedor principal del tablero y controles */}

        <div className="game-main-content">
          <div className="board-area">
            <div className="player-slot player-slot-left" aria-label={t('game.human_player')}>
              <div className="player-info">
                <div className="player-header-row">
                  <div className="player-avatar-box">
                    <img src={safePlayerIcon} alt={`Avatar de ${playerLabel}`} className="player-avatar-image" />
                  </div>
                  <p className="player-label player-label-blue">{t('game.player')}: {playerLabel}</p>
                </div>
                {timerVisible && turnTimeLimit !== null && winner === null && (
                  <div className="turn-timer-under" style={{ width: '100%', maxWidth: '16rem' }}>
                    <div className="turn-timer-header">
                      <span className="turn-timer-label">{t('game.your_turn')}</span>
                      <span className={`turn-timer-seconds ${(turnTimeLeft ?? 0) <= 5 ? 'turn-timer-urgent' : ''}`}> {turnTimeLeft ?? 0}s</span>
                    </div>
                    <div className="turn-timer-bar-bg">
                      <div
                        className={`turn-timer-bar ${(turnTimeLeft ?? 0) <= 5 ? 'turn-timer-bar-urgent' : ''}`}
                        style={{ width: `${((turnTimeLeft ?? 0) / turnTimeLimit) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={`board-container board-size-${boardDimension}`}>
              {boardData ? (
                rows.map((row, rowIndex) => (
                  <div key={row} className="board-row">
                  {row.split('').map((cell, cellIndex) => {
                      // Índice lineal triangular que espera el backend para /move.
                      const currentIndex = rowStartIndex(rowIndex) + cellIndex;
                      const isRealCell = hasRealCellAtIndex(currentIndex);
                      const cellClassName = getCellClassName(cell);
                      const cellStatusLabel = getCellStatusLabel(cell);
                      const cellContent = cell === '.' ? '' : cell;
                      return (
                        <button
                          key={`${currentIndex}-${cell}`}
                          type="button"
                          className={`cell ${cellClassName}`}
                          onClick={() =>
                            isRealCell && cell === '.' && winner === null && onCellClick(currentIndex)
                          } // Solo permite celdas vacias
                          disabled={!isRealCell || cell !== '.' || winner !== null} // Bloquea celdas virtuales, ocupadas o partida terminada
                          aria-label={`Celda ${currentIndex}, ${cellStatusLabel}`}
                        >
                          {cellContent}
                        </button>
                      );
                    })}
                  </div>
                ))
              ) : (
                // Mensaje mostrado si todavia no llego tablero desde /reset
                <p>{t('game.load_board')}</p>
              )}
            </div>

            {/* Componente del oponente */}
            <OpponentCard
              state={isBotMode ? OpponentState.CONNECTED : (rivalName ? OpponentState.CONNECTED : OpponentState.WAITING)}
              opponentName={isBotMode ? botName : (rivalName || null)}
              opponentIcon={isBotMode ? (botIcon || null) : (rivalIcon || null)}
              onInviteFriend={onAddFriend || (() => {})}
              isOpponentTurn={gameMode === 'multiplayer' ? (multiplayerTurn !== null && multiplayerTurn !== username) : false}
            />
          </div>

        </div>

      <div className="match-info-floating" aria-label={t('game.match_info')}>
        <div className="match-info-box">
          <strong className="match-info-title">{t('game.match_info')}</strong>
          <div className="match-info-line">{t('game.difficulty')}: {difficultyLabel}</div>
          <div className="match-info-line">{t('game.board_size')}: {sizeLabel || `${boardDimension}x${boardDimension}x${boardDimension}`}</div>
          <div className="match-info-line">{t('game.rival_name')}: {botName}</div>
        </div>
      </div>
      <div className="bot-guide-floating" aria-label="Guia rapida bot">
        <div className="bot-guide-box">
          <strong className="guide-center-heading">{t('game.objective_title')}</strong>
          <br />
          - {t('game.objective_1')}
          <br />
          - {t('game.objective_2')}
          <br />
          <br />
          <strong className="guide-center-heading">{t('game.instructions_title')}</strong>
          <br />
          - {t('game.instructions_1')}
          <br />
          - {t('game.instructions_2')}
        </div>
      </div>
    </div>
  );
}

export default GameScreen;


