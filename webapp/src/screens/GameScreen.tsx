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

interface GameYData {
  size: number;
  turn: number;
  players: string[];
  layout: string;
}

interface GameScreenProps {
  username: string;
  displayName?: string;
  playerIcon?: string | null;
  botIcon?: string | null;
  difficultyChoice: DifficultyChoice | null;
  selectedBoardDimension: number | null;
  boardData: GameYData | null;
  winner: number | null;
  connectionStatus: string;
  turnTimeLeft: number | null;
  turnTimeLimit: number | null;
  timerVisible: boolean;
  sizeLabel: string | null;
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
}

function GameScreen({
  username,
  displayName,
  playerIcon,
  botIcon,
  difficultyChoice,
  selectedBoardDimension,
  boardData,
  winner,
  turnTimeLeft,
  turnTimeLimit,
  timerVisible,
  sizeLabel,
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
  onOpenTutorial
}: GameScreenProps) {
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
  const difficultyLabel = difficultyChoice || 'Sin seleccionar';

  // Nombre del Bot: Dinámico según lo que recibimos
  const botName = difficultyLabel !== 'Sin seleccionar' 
    ? `Bot Player (${difficultyLabel})` 
    : 'Bot Player';

  const boardDimension = boardData?.size ?? selectedBoardDimension ?? 6;
  //const currentSizeValue: SizeChoice = `Tamaño ${boardDimension}x${boardDimension}x${boardDimension}` as SizeChoice;
  const safePlayerIcon = playerIcon && playerIcon.trim() ? playerIcon : defaultAvatar;
  const safeBotIcon = botIcon && botIcon.trim() ? botIcon : defaultAvatar;
  const playerLabel = displayName && displayName.trim() ? displayName : username;

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

        <button className="nav-btn nav-btn-icon-frame nav-btn" onClick={onViewProfile} title="Ver mi perfil">
          <img className="nav-btn-profile-img" src={safePlayerIcon} alt="Ver mi perfil" />
        </button>

        <div className="nav-center-title">Partida vs IA</div>

        <div className="nav-game-settings">
          {/* MENÚ TAMAÑO */}
          <div className="custom-dropdown-container">
            <button 
              className={`dropdown-trigger ${showSizeMenu ? 'active' : ''}`}
              onClick={() => { setShowSizeMenu(!showSizeMenu); setShowDiffMenu(false); }}
            >
              Cambiar Tamaño ▾
            </button>
            
            {showSizeMenu && (
              <div className="dropdown-floating-list">
                {SIZE_OPTIONS.map((option) => (
                  <div 
                    key={option} 
                    className="dropdown-item"
                    onClick={() => {
                      onChangeSize(option);
                      setShowSizeMenu(false);
                    }}
                  >
                    {option}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MENÚ DIFICULTAD */}
          <div className="custom-dropdown-container">
            <button 
              className={`dropdown-trigger ${showDiffMenu ? 'active' : ''}`}
              onClick={() => { setShowDiffMenu(!showDiffMenu); setShowSizeMenu(false); }}
            >
              Dificultad: {difficultyLabel} ▾
            </button>
            
            {showDiffMenu && (
              <div className="dropdown-floating-list">
                {['Fácil', 'Medio', 'Difícil'].map((diff) => (
                  <div 
                    key={diff} 
                    className="dropdown-item"
                    onClick={() => {
                      onChangeDifficulty(diff as DifficultyChoice);
                      setShowDiffMenu(false);
                    }}
                  >
                    {diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="nav-btn-spacer" aria-hidden="true" />
          <div className="nav-icon-action">
            <button className="nav-btn danger nav-btn-with-lottie" onClick={onEndGame} title="Terminar partida">
              <img className="nav-btn-png" src={botonRojo} alt="Terminar partida" />
              <span className="nav-btn-lottie-hover" aria-hidden="true">
                <Lottie animationData={failedJson} loop autoplay lottieRef={failedLottieRef} />
              </span>
            </button>
            <span className="nav-icon-caption">Rendirse</span>
          </div>
          <div className="nav-icon-action">
            <button className="nav-btn nav-btn-icon-frame nav-btn-with-restart" onClick={onResetGame} title="Reiniciar partida">
              <img className="nav-btn-reset-img" src={reiniciarPartidaImg} alt="Reiniciar partida" />
              <span className="nav-btn-restart-hover" aria-hidden="true">
                <Lottie animationData={restartJson} loop autoplay lottieRef={restartLottieRef} />
              </span>
            </button>
            <span className="nav-icon-caption">Reiniciar</span>
          </div>
          <div className="nav-icon-action">
            <button
              className="nav-btn nav-btn-icon-frame nav-btn-with-settings"
              onClick={onOpenSettings}
              title="Configuración"
              aria-label="Configuración"
            >
              <img className="nav-btn-settings-img" src={settingsImg} alt="Configuración" />
              <span className="nav-btn-settings-hover" aria-hidden="true">
                <Lottie animationData={settingsJson} loop autoplay lottieRef={settingsLottieRef} />
              </span>
            </button>
            <span className="nav-icon-caption">Ajustes</span>
          </div>
          <div className="nav-btn-spacer" aria-hidden="true" />
          <div className="nav-icon-action">
            <button className="nav-btn nav-btn-icon-frame nav-btn-with-history" onClick={onFetchHistory} title="Ver historial">
              <img className="nav-btn-history-img" src={historialImg} alt="Historial" />
              <span className="nav-btn-history-hover" aria-hidden="true">
                <Lottie animationData={historyJson} loop autoplay lottieRef={historyLottieRef} />
              </span>
            </button>
            <span className="nav-icon-caption">Historial</span>
          </div>
          {onOpenTutorial && (
            <div className="nav-icon-action">
              <button
                className="nav-btn nav-btn-icon-frame nav-btn-with-help"
                onClick={onOpenTutorial}
                title="Abrir ayuda"
                aria-label="Ayuda"
              >
                <span className="nav-btn-help-glyph" aria-hidden="true">?</span>
                <span className="nav-btn-help-hover" aria-hidden="true">?</span>
              </button>
              <span className="nav-icon-caption">Ayuda</span>
            </div>
          )}
          <div className="nav-icon-action">
            <button className="nav-btn nav-btn-icon-frame nav-btn" onClick={onAddFriend} title="Ver menú de amigos">
              <img className="nav-btn-friends-img" src={amigosImg} alt="Amigos" />
            </button>
            <span className="nav-icon-caption">Amigos</span>
          </div>

          <div className="nav-btn-spacer" aria-hidden="true" />
          <div className="nav-icon-action">
            <button className="nav-btn danger nav-btn-icon-frame nav-btn-with-logout" onClick={onExit} title="Volver al menú">
              <img className="nav-btn-exit-img" src={salirMenuImg} alt="Salir" />
              <span className="nav-btn-logout-hover" aria-hidden="true">
                <Lottie animationData={logoutJson} loop autoplay lottieRef={logoutLottieRef} />
              </span>
            </button>
            <span className="nav-icon-caption">Salir</span>
          </div>
        </div>

      </nav>

      {/* Contenedor principal del tablero y controles */}

        <div className="game-main-content">
          <div className="board-area">
            <div className="player-slot player-slot-left" aria-label="Jugador humano">
              <div className="player-info">
                <div className="player-header-row">
                  <div className="player-avatar-box">
                    <img src={safePlayerIcon} alt={`Avatar de ${playerLabel}`} className="player-avatar-image" />
                  </div>
                  <p className="player-label player-label-blue">Jugador: {playerLabel}</p>
                </div>
                {timerVisible && turnTimeLimit !== null && winner === null && (
                  <div className="turn-timer-under" style={{ width: '100%', maxWidth: '16rem' }}>
                    <div className="turn-timer-header">
                      <span className="turn-timer-label">Tu turno</span>
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
                  <div key={rowIndex} className="board-row">
                  {row.split('').map((cell, cellIndex) => {
                      // Índice lineal triangular que espera el backend para /move.
                      const currentIndex = rowStartIndex(rowIndex) + cellIndex;
                      const isRealCell = hasRealCellAtIndex(currentIndex);
                      return (
                        <button
                          key={cellIndex}
                          type="button"
                          className={`cell ${cell === 'B' ? 'blue' : cell === 'R' ? 'red' : 'empty'}`}
                          onClick={() =>
                            isRealCell && cell === '.' && winner === null && onCellClick(currentIndex)
                          } // Solo permite celdas vacias
                          disabled={!isRealCell || cell !== '.' || winner !== null} // Bloquea celdas virtuales, ocupadas o partida terminada
                          aria-label={`Celda ${currentIndex}, ${cell === 'B' ? 'ocupada por azul' : cell === 'R' ? 'ocupada por rojo' : 'vacia'}`}
                        >
                          {cell !== '.' ? cell : ''}
                        </button>
                      );
                    })}
                  </div>
                ))
              ) : (
                // Mensaje mostrado si todavia no llego tablero desde /reset
                <p>Carga el tablero para comenzar</p>
              )}
            </div>

            <div className="player-slot player-slot-right" aria-label="Jugador bot">
              <div className="player-info player-info-right">
                <div className="player-header-row player-header-row-right">
                  <p className="player-label player-label-red">{botName}</p>
                  <div className="player-avatar-box">
                    <img src={safeBotIcon} alt="Avatar del bot" className="player-avatar-image" />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

      <div className="match-info-floating" aria-label="Informacion de la partida">
        <div className="match-info-box">
          <strong className="match-info-title">Información de la partida</strong>
          <div className="match-info-line">Dificultad: {difficultyLabel}</div>
          <div className="match-info-line">Tamaño de tablero: {sizeLabel || `${boardDimension}x${boardDimension}x${boardDimension}`}</div>
          <div className="match-info-line">Nombre del rival: {botName}</div>
        </div>
      </div>
      <div className="bot-guide-floating" aria-label="Guia rapida bot">
        <div className="bot-guide-box">
          <strong className="guide-center-heading">Objetivo</strong>
          <br />
          - Tocar las 3 paredes por una union de tus fichas
          <br />
          - Gana el que primero toque las 3 paredes por una union de sus fichas
          <br />
          <br />
          <strong className="guide-center-heading">Instrucciones</strong>
          <br />
          - Haz clic en una celda vacia para colocar tu ficha, antes de que se acabe el tiempo y se coloque de forma aleatoria
          <br />
          - Enlaza fichas en una casilla contigua a otra tuya hasta hacer un conjunto de fichas que toquen las 3 paredes
        </div>
      </div>
    </div>
  );
}

export default GameScreen;


