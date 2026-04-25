import type { GameYData } from '../types/game';

export type ProviderMoveResult = {
  board: GameYData | null;
  winner: number | string | null;
  score?: number;
};

export interface RivalInfo {
  name?: string | null;
  icon?: string | null;
}

export interface GameProvider {
  mode: 'bot' | 'multiplayer';
  initialize: () => Promise<void>;
  onCellClick: (index: number) => Promise<ProviderMoveResult | null | undefined>;
  reset: (size: number, difficulty: string) => Promise<void>;
  surrender: (difficulty: string) => Promise<void>;
  dispose: () => void;
  getRivalInfo?: () => RivalInfo | null;
}

