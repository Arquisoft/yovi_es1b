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
import { getVictoryPointsLabel } from '../utils/scoreUtils';
import { getDifficultyLabelKey, getSizeLabelKey } from '../utils/gameLabelUtils';

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
  gameMode?: string | null;
  opponentDisplayName?: string | null;
  opponentDisplayIcon?: string | null;
  isPlayerTurn?: boolean;
  isOpponentTurn?: boolean;
  difficultyChoice: DifficultyChoice | null;
  selectedBoardDimension: number | null;
  boardData: GameYData | null;
  winner: number | null;
  turnTimeLeft: number | null;
  turnTimeLimit: number | null;
  timerVisible: boolean;
  sizeLabel: string | null;
  totalScore: number; // Nuevo prop para el puntaje total acumulado del usuario
  gameStarted?: boolean;
  restartDisabled?: boolean;
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
  opponentDisplayName,
  opponentDisplayIcon,
  isPlayerTurn = true,
  isOpponentTurn = false,
  difficultyChoice,
  selectedBoardDimension,
  boardData,
  winner,
  turnTimeLeft,
  turnTimeLimit,
  timerVisible,
  sizeLabel,
  totalScore,
  gameStarted = false,
  restartDisabled = false,
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
  const difficultyLabel = difficultyChoice ? t(`game.${getDifficultyLabelKey(difficultyChoice)}`) : t('game.no_difficulty');
  const difficultyOptions: DifficultyChoice[] = ['Fácil', 'Medio', 'Difícil'];
  const translatedSizeLabel = t(`game.${getSizeLabelKey(sizeLabel)}`);

  // Nombre del Bot: Dinámico según lo que recibimos
  let botName = 'Bot Player';
  if (gameMode === 'multiplayer') {
    botName = opponentDisplayName?.trim() || t('mode.multiplayer_duel');
  } else if (difficultyChoice) {
    botName = `Bot Player (${difficultyLabel})`;
  }

  const boardDimension = boardData?.size ?? selectedBoardDimension ?? 6;
  const safePlayerIcon = playerIcon?.trim() ? playerIcon : defaultAvatar;
  const safeBotIcon = (gameMode === 'multiplayer' ? opponentDisplayIcon : botIcon)?.trim() || defaultAvatar;
  const playerLabel = displayName?.trim() ? displayName : username;
  let turnStatusLabel: string | null = null;
  if (gameMode === 'multiplayer') {
    if (isPlayerTurn) {
      turnStatusLabel = 'Tu turno';
    } else if (isOpponentTurn) {
      turnStatusLabel = 'Turno del rival';
    } else {
      turnStatusLabel = 'Esperando rival';
    }
  }
  const victoryPointsLabel = getVictoryPointsLabel(difficultyChoice, boardDimension);
  const canSurrender = boardData !== null && winner === null && gameStarted;
  const canChangeGameSetup = !gameStarted || winner !== null;
  const canRestart = !restartDisabled;

  useEffect(() => {
    if (gameStarted) {
      setShowSizeMenu(false);
      setShowDiffMenu(false);
    }
  }, [gameStarted]);

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
          <h2>{t('game.player')}: <span>{username}</span></h2>
        </div>


        {/* --- BOTÓN DE PUNTOS CENTRAL --- */}
        <div className="nav-center-score">
            <span className="score-caption">{t('game.my_points')}</span>
            <button className="score-badge-button" onClick={onScoreButtonClick}>
                <span className="score-star">★</span>
                <span className="score-text">{totalScore.toLocaleString()} XP</span>
            </button>
        </div>

        <div className="nav-game-settings">
          <div className="nav-setup-item">
            {/* MENÚ TAMAÑO */}
            <div className="custom-dropdown-container">
              <button
                className={`dropdown-trigger ${showSizeMenu ? 'active' : ''}`}
                onClick={() => { setShowSizeMenu(!showSizeMenu); setShowDiffMenu(false); }}
                disabled={!canChangeGameSetup}
                aria-disabled={!canChangeGameSetup}
              >
                <span className="dropdown-trigger-text">
                  <span className="dropdown-trigger-label">{t('game.size')}:</span>
                  <span className="dropdown-trigger-value">{translatedSizeLabel}</span>
                </span>
                <span className="dropdown-trigger-arrow" aria-hidden="true">▾</span>
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
                      {t(`game.${getSizeLabelKey(option)}`)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* MENÚ DIFICULTAD */}
          <div className="custom-dropdown-container">
            <button
              className={`dropdown-trigger ${showDiffMenu ? 'active' : ''}`}
              onClick={() => { setShowDiffMenu(!showDiffMenu); setShowSizeMenu(false); }}
              disabled={!canChangeGameSetup}
              aria-disabled={!canChangeGameSetup}
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
                    {t(`game.${getDifficultyLabelKey(diff)}`)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="nav-btn-spacer" aria-hidden="true" />
          <div className="nav-icon-action">
            <button
              className="nav-btn danger nav-btn-with-lottie"
              onClick={onEndGame}
              title={t('game.end_game')}
              disabled={!canSurrender}
              aria-disabled={!canSurrender}
            >
              <img className="nav-btn-png" src={botonRojo} alt={t('game.end_game')} />
              <span className="nav-btn-lottie-hover" aria-hidden="true">
                <Lottie animationData={failedJson} loop autoplay lottieRef={failedLottieRef} />
              </span>
            </button>
            <span className="nav-icon-caption">{t('game.surrender')}</span>
          </div>
          <div className="nav-icon-action">
            <button
              className="nav-btn nav-btn-icon-frame nav-btn-with-restart"
              onClick={onResetGame}
              title={t('game.restart')}
              disabled={!canRestart}
              aria-disabled={!canRestart}
            >
              <img className="nav-btn-reset-img" src={reiniciarPartidaImg} alt={t('game.restart')} />
              <span className="nav-btn-restart-hover" aria-hidden="true">
                <Lottie animationData={restartJson} loop autoplay lottieRef={restartLottieRef} />
              </span>
            </button>
            <span className="nav-icon-caption">{t('game.restart_short')}</span>
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
            <span className="nav-icon-caption nav-icon-caption-settings">{t('game.settings')}</span>
          </div>
          <div className="nav-icon-action">
            <button
              id="friends-menu-button"
              className="nav-btn nav-btn-icon-frame nav-btn"
              onClick={onAddFriend}
              title={t('game.friends_menu')}
              aria-label={t('game.friends_menu')}
            >
              <img className="nav-btn-friends-img" src={amigosImg} alt={t('game.friends_menu_short')} />
            </button>
            <span className="nav-icon-caption">{t('game.friends_menu_short')}</span>
          </div>

          {onGoToModeMenu && (
            <div className="nav-icon-action">
              <button className="nav-btn nav-btn-icon-frame nav-btn" onClick={onGoToModeMenu} title={t('game.mode_menu')}>
                {t('game.mode_menu')}
              </button>
              <span className="nav-icon-caption">{t('game.mode_menu')}</span>
            </div>
          )}

          <div className="nav-btn-spacer" aria-hidden="true" />
          <div className="nav-icon-action">
            <button className="nav-btn danger nav-btn-icon-frame nav-btn-with-logout" onClick={onExit} title="Cerrar sesion">
              <img className="nav-btn-exit-img" src={salirMenuImg} alt="Cerrar sesion" />
              <span className="nav-btn-logout-hover" aria-hidden="true">
                <Lottie animationData={logoutJson} loop autoplay lottieRef={logoutLottieRef} />
              </span>
            </button>
            <span className="nav-icon-caption nav-icon-caption-exit">Cerrar sesion</span>
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
                {gameMode === 'multiplayer' && (
                  <div className={`turn-pill ${isPlayerTurn ? 'turn-pill-active' : 'turn-pill-waiting'}`}>
                    <span className="turn-pill-icon" aria-hidden="true">{isPlayerTurn ? '!' : '...'}</span>
                    <span>{turnStatusLabel}</span>
                  </div>
                )}
                {timerVisible && turnTimeLimit !== null && winner === null && (
                  <div className="turn-timer-under">
                    <div className="turn-timer-header">
                      <span className="turn-timer-label">{t('game.your_turn')}</span>
                      <span className={`turn-timer-seconds ${(turnTimeLeft ?? 0) <= 5 ? 'turn-timer-urgent' : ''}`}> {turnTimeLeft ?? 0}s</span>
                    </div>
                    <progress
                      className={`turn-timer-progress ${(turnTimeLeft ?? 0) <= 5 ? 'turn-timer-progress-urgent' : ''}`}
                      value={turnTimeLeft ?? 0}
                      max={turnTimeLimit}
                      aria-label={t('game.your_turn')}
                    />
                  </div>
                )}
              </div>
            </div>

            <div id="game-board" className={`board-container board-size-${boardDimension}`}>
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
                          data-testid={`game-cell-${currentIndex}`}
                          type="button"
                          className={`cell ${cellClassName}`}
                          onClick={() =>
                            isRealCell && cell === '.' && winner === null && isPlayerTurn && onCellClick(currentIndex)
                          } // Solo permite celdas vacias
                          disabled={!isRealCell || cell !== '.' || winner !== null || !isPlayerTurn} // Bloquea celdas virtuales, ocupadas o partida terminada
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

            <div className="player-slot player-slot-right" aria-label={t('game.bot_player_slot')}>
              <div className="player-info player-info-right">
                <div className="player-header-row player-header-row-right">
                  <p className="player-label player-label-red">{botName}</p>
                  <div className="player-avatar-box">
                    <img src={safeBotIcon} alt="Avatar del bot" className="player-avatar-image" />
                  </div>
                </div>
                {gameMode === 'multiplayer' && (
                  <div className={`turn-pill ${isOpponentTurn ? 'turn-pill-active turn-pill-red' : 'turn-pill-waiting'}`}>
                    <span className="turn-pill-icon" aria-hidden="true">{isOpponentTurn ? 'o' : '...'}</span>
                    <span>{isOpponentTurn ? 'Su turno' : 'Esperando'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

      <div className="match-info-floating" aria-label={t('game.match_info')}>
        <div className="match-info-box">
          <strong className="match-info-title">{t('game.match_info')}</strong>
          <div className="match-info-line">{t('game.difficulty')}: {difficultyLabel}</div>
          <div className="match-info-line">{t('game.board_size')}: {translatedSizeLabel || `${boardDimension}x${boardDimension}x${boardDimension}`}</div>
          <div className="match-info-line">{t('game.victory_points')}: {victoryPointsLabel}</div>
          <div className="match-info-line">{t('game.rival_name')}: {botName}</div>
        </div>
      </div>
      <div className="bot-guide-floating" aria-label="Guia rapida bot">
        <div className="bot-guide-box">
          <strong className="guide-center-heading guide-objective-heading">{t('game.objective_title')}</strong>
          <br />
          - {t('game.objective_1')}
          <br />
          <strong className="guide-center-heading guide-instructions-heading">{t('game.instructions_title')}</strong>
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
