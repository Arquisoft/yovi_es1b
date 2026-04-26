import { useCallback, useState } from 'react';
import { gameService } from '../services/gameService';
import { patchTriangularLayoutCell } from '../utils/boardUtils';
import type { GameYData } from '../types/game';

type GameHistoryContext = Readonly<{
  boardLabel?: string | null;
  locale?: string | null;
  resultLabel?: string | null;
}>;

export const useGameLogic = () => {
  const [boardData, setBoardData] = useState<GameYData | null>(null);
  const [winner, setWinner] = useState<number | null>(null);

  // Función interna para aplicar el parche visual y actualizar estado
  const updateBoardState = useCallback((data: any, cellIndex: number) => {
    if (data.responseFromRust) {
      const serverBoard = data.responseFromRust as GameYData;
      const boardSize = serverBoard.size || 5;
      const serverFlatLayout = serverBoard.layout.replaceAll('/', '');
      const shouldPatch = cellIndex >= 0 && serverFlatLayout[cellIndex] === '.';

      setBoardData(shouldPatch ? {
        ...serverBoard,
        layout: patchTriangularLayoutCell(serverBoard.layout, boardSize, cellIndex, 'B'),
      } : serverBoard);

      setWinner(data.winner);
    }
    return data;
  }, []);

  // Movimiento del Jugador
  const executeHumanMove = useCallback(async (
    index: number,
    difficulty: string,
    stopTimer: () => void,
    startTimer: (d: string) => void,
    historyContext?: GameHistoryContext,
  ) => {
    stopTimer();
    const data = await gameService.makeMove(index, difficulty, boardData?.size, historyContext);
    const result = updateBoardState(data, index);

    if (result.winner === null) {
      setTimeout(() => startTimer(difficulty), 300);
    }
    return result;
  }, [boardData?.size, updateBoardState]);

  // Movimiento Automático (Bot/Tiempo agotado)
  const executeAutoMove = useCallback(async (
    difficulty: string,
    startTimer: (d: string) => void,
    historyContext?: GameHistoryContext,
  ) => {
    if (!boardData || winner !== null) return;

    const flat = boardData.layout.replaceAll('/', '');
    const emptyCells = [...flat].map((c, i) => (c === '.' ? i : -1)).filter((i) => i !== -1);

    if (emptyCells.length === 0) return;

    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    const randomIndex = emptyCells[array[0] % emptyCells.length];

    const data = await gameService.makeMove(randomIndex, difficulty, boardData?.size, historyContext);
    const result = updateBoardState(data, randomIndex);

    if (result.winner === null) {
      startTimer(difficulty);
    }
    return result;
  }, [boardData, updateBoardState, winner]);

  const resetGame = useCallback(async (dimension: number, difficulty: string, stopTimer?: () => void) => {
    stopTimer?.();
    const board = await gameService.resetBoard(dimension, difficulty);
    setBoardData(board);
    setWinner(null);
    return board;
  }, []);

  const surrender = useCallback(async (
    difficulty: string,
    historyContext?: GameHistoryContext,
  ) => {
    if (historyContext) {
      await gameService.surrender(difficulty, boardData?.size, historyContext);
    } else {
      await gameService.surrender(difficulty, boardData?.size);
    }
    setWinner(1);
  }, [boardData?.size]);

  return { boardData, winner, setBoardData, setWinner, executeHumanMove, executeAutoMove, resetGame, surrender };
};
