import type { GameYData } from './game';

export type GameMode = 'bot' | 'multiplayer';

export interface ChallengePlayerEvent {
  challengeId: string;
  challenger: string;
  challengerIcon?: string;
  target?: string;
  boardSize: number;
  status?: 'sent';
}

export interface AcceptChallengeEvent {
  challengeId: string;
}

export interface GameMoveEvent {
  matchId: string;
  cellIndex: number;
}

export interface SyncBoardEvent {
  matchId?: string;
  roomId?: string;
  board?: GameYData;
  players?: string[];
  currentTurn?: string;
  winner?: string | null;
  lastMoveBy?: string;
  lastMoveCell?: number;
  error?: string;
  rivalName?: string;
  rivalIcon?: string;
}

export interface PlayerDisconnectedEvent {
  matchId: string;
  username: string;
}

export interface ServerToClientEvents {
  challenge_player: (payload: ChallengePlayerEvent) => void;
  sync_board: (payload: SyncBoardEvent) => void;
  player_disconnected: (payload: PlayerDisconnectedEvent) => void;
}

export interface ClientToServerEvents {
  challenge_player: (payload: { opponentUsername: string; boardSize: number }) => void;
  accept_challenge: (payload: AcceptChallengeEvent) => void;
  game_move: (payload: GameMoveEvent) => void;
  join_match: (payload: { matchId: string }) => void;
  leave_match: (payload: { matchId: string }) => void;
}

