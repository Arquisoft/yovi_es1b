// Para manejar el motor del juego: tablero, movimientos, ganador...

import { useState } from 'react';
import { gameService } from '../services/gameService';
import { patchTriangularLayoutCell } from '../utils/boardUtils';
import type { GameYData } from '../types/game';

export const useGameLogic = (username: string) => {
  const [boardData, setBoardData] = useState<GameYData | null>(null);
  const [winner, setWinner] = useState<number | null>(null);

  // Función para procesar un movimiento (humano o bot)
  const processMove = async (cellIndex: number, difficulty: string) => {
    const data = await gameService.makeMove(cellIndex, username, difficulty, boardData?.size);

    if (data.responseFromRust) {
      const serverBoard = data.responseFromRust as GameYData;
      const boardSize = serverBoard.size || 5;
      
      // Aplicamos el parche visual para que la ficha aparezca al instante
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

  const resetGame = async (dimension: number, difficulty: string) => {
    const board = await gameService.resetBoard(dimension, difficulty, username);
    setBoardData(board);
    setWinner(null);
    return board;
  };

  const surrender = async (difficulty: string) => {
    try {
      await gameService.surrender(username, difficulty, boardData?.size);
      setWinner(1); // El bot gana automáticamente
      return true;
    } catch (error) {
      console.error("Error al rendirse:", error);
      return false;
    }
  };

  return { boardData, setBoardData, winner, setWinner, processMove, resetGame, surrender   };
};