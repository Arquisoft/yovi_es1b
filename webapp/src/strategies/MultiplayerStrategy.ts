import type { GameProvider, ProviderMoveResult, RivalInfo } from '../providers/GameProvider';
import { getSocketClient } from '../services/socketClient';
import type { ChallengePlayerEvent, SyncBoardEvent } from '../types/socketEvents';
import type { GameYData } from '../types/game';
import { gameService } from '../services/gameService';

type MultiplayerStrategyDeps = {
  username: string;
  boardSize: number;
  onSync: (payload: SyncBoardEvent) => void;
  onChallenge: (payload: ChallengePlayerEvent) => void;
  /** Callback cuando se obtiene la información del oponente */
  onOpponentDataFetched?: (rivalInfo: RivalInfo) => void;
};

/**
 * MultiplayerStrategy - Implementación de GameProvider para modo multijugador
 * SOLID:
 * - Single Responsibility: Solo gestiona la lógica de estrategia multijugador
 * - Open/Closed: Extensible para nuevos eventos Socket.io sin modificar el código existente
 * - Liskov Substitution: Implementa GameProvider, intercambiable con BotStrategy
 * - Dependency Inversion: Depende de abstracciones (GameProvider, gameService), no de implementaciones
 */
export class MultiplayerStrategy implements GameProvider {
  public readonly mode = 'multiplayer' as const;
  private readonly socket = getSocketClient();
  private readonly deps: MultiplayerStrategyDeps;
  private matchId: string | null = null;
  private rivalInfo: RivalInfo | null = null;
  private opponentUsername: string | null = null;
  private handleSyncBoard: (payload: SyncBoardEvent) => void;

  constructor(deps: MultiplayerStrategyDeps) {
    this.deps = deps;
    this.handleSyncBoard = (payload: SyncBoardEvent) => {
      if (payload.players && payload.players.length === 2) {
        const opponent = payload.players.find(p => p !== this.deps.username);
        if (opponent && this.opponentUsername !== opponent) {
          this.opponentUsername = opponent;
          this.fetchOpponentData(opponent).catch(err => {
            console.warn(`No se pudieron obtener datos del oponente:`, err);
          });
        }
      }
      this.deps.onSync(payload);
    };
  }

  async initialize() {
    this.socket.on('sync_board', this.handleSyncBoard);
    this.socket.on('challenge_player', this.deps.onChallenge);
  }

  challengePlayer(opponentUsername: string) {
    this.opponentUsername = opponentUsername;

    // Intentar obtener datos del oponente antes de enviar la invitación
    this.fetchOpponentData(opponentUsername).catch((err) => {
      console.warn(`No se pudieron obtener datos del oponente ${opponentUsername}:`, err);
      // Proceder sin datos en caso de fallo
    });

    this.socket.emit('challenge_player', {
      opponentUsername,
      boardSize: this.deps.boardSize,
    });
  }

  acceptChallenge(challengeId: string) {
    this.socket.emit('accept_challenge', { challengeId });
  }

  setMatchId(matchId: string) {
    if (this.matchId === matchId) return;
    this.matchId = matchId;
    this.socket.emit('join_match', { matchId });

    // Si tenemos un nombre de oponente, obtener sus datos
    if (this.opponentUsername) {
      this.fetchOpponentData(this.opponentUsername).catch((err) => {
        console.warn(`No se pudieron obtener datos del oponente:`, err);
      });
    }
  }

  /**
   * Obtener datos del oponente desde el servidor
   * Implementa el patrón de obtención asincrónica de datos
   */
  private async fetchOpponentData(opponentUsername: string): Promise<void> {
    try {
      const profile = await gameService.getPublicProfile(opponentUsername, this.deps.username);
      if (!profile || profile.error) {
        console.warn(`Perfil no encontrado para ${opponentUsername}`);
        return;
      }

      const rivalInfo: RivalInfo = {
        name: profile.nickname || profile.username || opponentUsername,
        icon: profile.iconName || profile.icon || null,
      };

      this.setRivalInfo(rivalInfo.name, rivalInfo.icon);
      this.deps.onOpponentDataFetched?.(rivalInfo);
    } catch (err) {
      console.error(`Error fetching opponent data for ${opponentUsername}:`, err);
      throw err;
    }
  }

  setRivalInfo(name?: string | null, icon?: string | null) {
    this.rivalInfo = { name, icon };
  }

  getRivalInfo(): RivalInfo | null {
    return this.rivalInfo;
  }

  async onCellClick(index: number): Promise<ProviderMoveResult | null> {
    if (!this.matchId) return null;
    this.socket.emit('game_move', {
      matchId: this.matchId,
      cellIndex: index,
    });
    return null;
  }

  async reset(size: number, difficulty: string) {
    void size;
    void difficulty;
    return;
  }

  async surrender(difficulty: string) {
    void difficulty;
    return;
  }

  dispose() {
    this.socket.off('sync_board', this.handleSyncBoard);
    this.socket.off('challenge_player', this.deps.onChallenge);
    this.rivalInfo = null;
    this.opponentUsername = null;
  }

  static boardFromSync(payload: SyncBoardEvent): GameYData | null {
    return payload.board ?? null;
  }
}

