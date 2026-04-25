import type { GameProvider, ProviderMoveResult } from '../providers/GameProvider';
import type { GameYData } from '../types/game';

type BotStrategyDeps = {
  getBoard: () => GameYData | null;
  getDifficulty: () => string;
  executeHumanMove: (index: number, difficulty: string, stopTimer: () => void, startTimer: (d: string) => void) => Promise<{ responseFromRust?: GameYData; winner: number | null; score: number }>;
  resetGame: (size: number, difficulty: string) => Promise<GameYData>;
  surrenderGame: (difficulty: string) => Promise<void>;
  startTimer: (d: string) => void;
  stopTimer: () => void;
  onBoardUpdate: (board: GameYData | null, winner: number | null) => void;
};

export class BotStrategy implements GameProvider {
  public readonly mode = 'bot' as const;
  private readonly deps: BotStrategyDeps;

  constructor(deps: BotStrategyDeps) {
    this.deps = deps;
  }

  async initialize() {
    return;
  }

  async onCellClick(index: number): Promise<ProviderMoveResult | null> {
    const result = await this.deps.executeHumanMove(index, this.deps.getDifficulty(), this.deps.stopTimer, this.deps.startTimer);
    const board = result.responseFromRust ?? this.deps.getBoard();
    this.deps.onBoardUpdate(board, result.winner);
    return { board, winner: result.winner, score: result.score };
  }

  async reset(size: number, difficulty: string) {
    const board = await this.deps.resetGame(size, difficulty);
    this.deps.onBoardUpdate(board, null);
  }

  async surrender(difficulty: string) {
    await this.deps.surrenderGame(difficulty);
  }

  dispose() {
    return;
  }
}

