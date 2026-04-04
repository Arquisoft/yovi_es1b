import { useState } from 'react';
import { gameService } from '../services/gameService';
import { patchTriangularLayoutCell } from '../utils/boardUtils';
import type { GameYData } from '../types/game';

export const useGameLogic = (username: string) => {
  const [boardData, setBoardData] = useState<GameYData | null>(null);
  const [winner, setWinner] = useState<number | null>(null);

  // Función interna para aplicar el parche visual y actualizar estado
  const updateBoardState = (data: any, cellIndex: number) => {
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
  };

  // Movimiento del Jugador
  const executeHumanMove = async (index: number, difficulty: string, stopTimer: () => void, startTimer: (d: string) => void) => {
    stopTimer();
    const data = await gameService.makeMove(index, username, difficulty, boardData?.size);
    const result = updateBoardState(data, index);
    
    if (result.winner === null) {
      setTimeout(() => startTimer(difficulty), 300);
    }
    return result;
  };

  // Movimiento Automático (Bot/Tiempo agotado)
  const executeAutoMove = async (difficulty: string, startTimer: (d: string) => void) => {
    if (!boardData || winner !== null) return;

    const flat = boardData.layout.replaceAll('/', '');
    const emptyCells = [...flat].map((c, i) => (c === '.' ? i : -1)).filter((i) => i !== -1);
    
    if (emptyCells.length === 0) return;
    //const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    const randomIndex = emptyCells[array[0] % emptyCells.length];

    const data = await gameService.makeMove(randomIndex, username, difficulty, boardData?.size);
    const result = updateBoardState(data, randomIndex);

    if (result.winner === null) {
      startTimer(difficulty);
    }
    return result;
  };

  const resetGame = async (dimension: number, difficulty: string, stopTimer?: () => void) => {
    stopTimer?.();                  // ← Para el timer ANTES de resetear
    const board = await gameService.resetBoard(dimension, difficulty, username);
    setBoardData(board);
    setWinner(null);
    return board;
  };

  const surrender = async (difficulty: string) => {
    await gameService.surrender(username, difficulty, boardData?.size);
    setWinner(1);
  };

  return { boardData, winner, executeHumanMove, executeAutoMove, resetGame, surrender };
};