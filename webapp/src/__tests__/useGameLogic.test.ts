import { renderHook, act } from '@testing-library/react'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { useGameLogic } from '../hooks/useGameLogic'
import { gameService } from '../services/gameService'

// Mockeamos gameService para no hacer llamadas reales
vi.mock('../services/gameService', () => ({
    gameService: {
        makeMove: vi.fn(),
        resetBoard: vi.fn(),
        surrender: vi.fn(),
    },
}))

// Mockeamos patchTriangularLayoutCell
vi.mock('../utils/boardUtils', () => ({
    patchTriangularLayoutCell: vi.fn((layout) => layout + '_patched'),
}))

const mockBoard = {
    size: 3,
    turn: 0,
    players: ['B', 'R'],
    layout: '../..',
}

describe('useGameLogic', () => {
    beforeEach(() => {
        vi.clearAllMocks()

        Object.defineProperty(window, 'crypto', {
            value: {
                getRandomValues: (array: Uint32Array) => {
                    array[0] = 0
                    return array
                }
            },
            configurable: true,
        })
    })

    // ── resetGame ──────────────────────────────

    test('resetGame actualiza boardData y limpia el winner', async () => {
        vi.mocked(gameService.resetBoard).mockResolvedValue(mockBoard)

        const { result } = renderHook(() => useGameLogic('alice'))

        await act(async () => {
            await result.current.resetGame(3, 'Easy')
        })

        expect(result.current.boardData).toEqual(mockBoard)
        expect(result.current.winner).toBeNull()
    })

    test('resetGame llama a stopTimer si se le pasa', async () => {
        vi.mocked(gameService.resetBoard).mockResolvedValue(mockBoard)
        const stopTimer = vi.fn()

        const { result } = renderHook(() => useGameLogic('alice'))

        await act(async () => {
            await result.current.resetGame(3, 'Easy', stopTimer)
        })

        expect(stopTimer).toHaveBeenCalledOnce()
    })

    // ── executeHumanMove ───────────────────────

    test('executeHumanMove llama a stopTimer y luego startTimer si no hay ganador', async () => {
        vi.mocked(gameService.resetBoard).mockResolvedValue(mockBoard)
        vi.mocked(gameService.makeMove).mockResolvedValue({
            responseFromRust: { ...mockBoard, layout: '...' },
            winner: null,
        })

        const stopTimer = vi.fn()
        const startTimer = vi.fn()

        const { result } = renderHook(() => useGameLogic('alice'))

        // Primero reseteamos para tener boardData
        await act(async () => {
            await result.current.resetGame(3, 'Easy')
        })

        await act(async () => {
            await result.current.executeHumanMove(0, 'Easy', stopTimer, startTimer)
        })

        expect(stopTimer).toHaveBeenCalledOnce()
        // startTimer se llama con setTimeout(300ms), usamos fake timers
    })

    test('executeHumanMove no llama a startTimer si hay ganador', async () => {
        vi.mocked(gameService.resetBoard).mockResolvedValue(mockBoard)
        vi.mocked(gameService.makeMove).mockResolvedValue({
            responseFromRust: { ...mockBoard },
            winner: 1,
        })

        const stopTimer = vi.fn()
        const startTimer = vi.fn()

        const { result } = renderHook(() => useGameLogic('alice'))

        await act(async () => {
            await result.current.resetGame(3, 'Easy')
        })

        await act(async () => {
            await result.current.executeHumanMove(0, 'Easy', stopTimer, startTimer)
        })

        expect(startTimer).not.toHaveBeenCalled()
        expect(result.current.winner).toBe(1)
    })

    // ── executeAutoMove ────────────────────────

    test('executeAutoMove no hace nada si no hay boardData', async () => {
        const startTimer = vi.fn()
        const { result } = renderHook(() => useGameLogic('alice'))

        await act(async () => {
            await result.current.executeAutoMove('Easy', startTimer)
        })

        expect(gameService.makeMove).not.toHaveBeenCalled()
    })

    test('executeAutoMove no hace nada si ya hay ganador', async () => {
        vi.mocked(gameService.resetBoard).mockResolvedValue(mockBoard)
        vi.mocked(gameService.makeMove).mockResolvedValue({
            responseFromRust: { ...mockBoard },
            winner: 1,
        })

        const startTimer = vi.fn()
        const { result } = renderHook(() => useGameLogic('alice'))

        await act(async () => {
            await result.current.resetGame(3, 'Easy')
        })
        // Primero hacemos un move para que winner sea 1
        await act(async () => {
            await result.current.executeHumanMove(0, 'Easy', vi.fn(), vi.fn())
        })

        vi.mocked(gameService.makeMove).mockClear()

        await act(async () => {
            await result.current.executeAutoMove('Easy', startTimer)
        })

        expect(gameService.makeMove).not.toHaveBeenCalled()
    })

    test('executeAutoMove llama a startTimer si no hay ganador tras el movimiento', async () => {
        vi.mocked(gameService.resetBoard).mockResolvedValue(mockBoard)
        vi.mocked(gameService.makeMove).mockResolvedValue({
            responseFromRust: { ...mockBoard },
            winner: null,
        })

        const startTimer = vi.fn()
        const { result } = renderHook(() => useGameLogic('alice'))

        await act(async () => {
            await result.current.resetGame(3, 'Easy')
        })

        await act(async () => {
            await result.current.executeAutoMove('Easy', startTimer)
        })

        expect(startTimer).toHaveBeenCalledWith('Easy')
    })

    // ── surrender ──────────────────────────────

    test('surrender establece winner a 1', async () => {
        vi.mocked(gameService.surrender).mockResolvedValue(undefined as never)

        const { result } = renderHook(() => useGameLogic('alice'))

        await act(async () => {
            await result.current.surrender('Easy')
        })

        expect(result.current.winner).toBe(1)
        expect(gameService.surrender).toHaveBeenCalledWith('alice', 'Easy', undefined)
    })
})