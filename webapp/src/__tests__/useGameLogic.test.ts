import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useGameLogic } from '../hooks/useGameLogic';
import { patchTriangularLayoutCell } from '../utils/boardUtils';
import { gameService } from '../services/gameService';
import type { GameYData } from '../types/game';

vi.mock('../services/gameService', () => ({
  gameService: {
    makeMove: vi.fn(),
    resetBoard: vi.fn(),
    surrender: vi.fn(),
  },
}));

const makeBoard = (layout: string, size = 3): GameYData => ({
  size,
  turn: 0,
  players: ['B', 'R'],
  layout,
  score: 0,
});

const mockedGameService = vi.mocked(gameService);

describe('useGameLogic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('executeHumanMove actualiza el tablero y reanuda el temporizador si no hay ganador', async () => {
    const startTimer = vi.fn();
    const stopTimer = vi.fn();
    const responseBoard = makeBoard('......');

    mockedGameService.makeMove.mockResolvedValue({
      responseFromRust: responseBoard,
      winner: null,
    });

    const { result } = renderHook(() => useGameLogic());

    let moveResult: Awaited<ReturnType<typeof result.current.executeHumanMove>> | undefined;
    await act(async () => {
      moveResult = await result.current.executeHumanMove(0, 'Easy', stopTimer, startTimer);
    });

    expect(stopTimer).toHaveBeenCalledTimes(1);
    expect(mockedGameService.makeMove).toHaveBeenCalledWith(0, 'Easy', undefined, undefined);
    expect(moveResult).toEqual({
      responseFromRust: responseBoard,
      winner: null,
    });
    expect(result.current.boardData?.layout).toBe(
      patchTriangularLayoutCell(responseBoard.layout, responseBoard.size, 0, 'B')
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(startTimer).toHaveBeenCalledWith('Easy');
  });

  test('executeAutoMove elige una celda vacia y actualiza el tablero', async () => {
    const startTimer = vi.fn();
    const responseBoard = makeBoard('B.....');
    const getRandomValuesSpy = vi
      .spyOn(window.crypto, 'getRandomValues')
      .mockImplementation((array) => {
        (array as Uint32Array)[0] = 0;
        return array;
      });

    mockedGameService.makeMove.mockResolvedValue({
      responseFromRust: responseBoard,
      winner: null,
    });

    const { result } = renderHook(() => useGameLogic());

    await act(async () => {
      await result.current.executeHumanMove(0, 'Easy', vi.fn(), vi.fn());
    });

    let autoMoveResult: Awaited<ReturnType<typeof result.current.executeAutoMove>> | undefined;
    await act(async () => {
      autoMoveResult = await result.current.executeAutoMove('Easy', startTimer);
    });

    expect(getRandomValuesSpy).toHaveBeenCalled();
    expect(mockedGameService.makeMove).toHaveBeenLastCalledWith(1, 'Easy', 3, undefined);
    expect(autoMoveResult).toEqual({
      responseFromRust: responseBoard,
      winner: null,
    });
    expect(result.current.boardData?.layout).toBe(
      patchTriangularLayoutCell(responseBoard.layout, responseBoard.size, 1, 'B')
    );
    expect(startTimer).toHaveBeenCalledWith('Easy');
  });

  test('resetGame reemplaza el tablero y limpia el ganador', async () => {
    const board = makeBoard('......');
    mockedGameService.resetBoard.mockResolvedValue(board);

    const { result } = renderHook(() => useGameLogic());

    await act(async () => {
      await result.current.resetGame(3, 'Medium');
    });

    expect(mockedGameService.resetBoard).toHaveBeenCalledWith(3, 'Medium');
    expect(result.current.boardData).toEqual(board);
    expect(result.current.winner).toBeNull();
  });

  test('surrender delega en el servicio y marca la derrota', async () => {
    mockedGameService.surrender.mockResolvedValue(new Response(null));

    const { result } = renderHook(() => useGameLogic());

    await act(async () => {
      await result.current.surrender('Hard');
    });

    expect(mockedGameService.surrender).toHaveBeenCalledWith('Hard', undefined);
    expect(result.current.winner).toBe(1);
  });
});
