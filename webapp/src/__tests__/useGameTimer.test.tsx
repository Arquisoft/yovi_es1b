import { renderHook, act } from '@testing-library/react'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { useGameTimer } from '../hooks/useGameTimer'

describe('useGameTimer', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    test('startTimer con dificultad en español usa el límite correcto', () => {
        const onTimeUp = vi.fn()
        const { result } = renderHook(() => useGameTimer(onTimeUp))

        act(() => result.current.startTimer('Fácil'))
        expect(result.current.timeLeft).toBe(60)

        act(() => result.current.startTimer('Medio'))
        expect(result.current.timeLeft).toBe(30)

        act(() => result.current.startTimer('Difícil'))
        expect(result.current.timeLeft).toBe(15)
    })

    test('stopTimer detiene la cuenta y no llama a onTimeUp', () => {
        const onTimeUp = vi.fn()
        const { result } = renderHook(() => useGameTimer(onTimeUp))

        act(() => result.current.startTimer('Easy'))
        act(() => result.current.stopTimer())
        act(() => vi.advanceTimersByTime(60_000))

        expect(onTimeUp).not.toHaveBeenCalled()
    })

    test('llama a onTimeUp cuando el tiempo se agota', () => {
        const onTimeUp = vi.fn()
        const { result } = renderHook(() => useGameTimer(onTimeUp))

        act(() => result.current.startTimer('Easy'))
        act(() => vi.advanceTimersByTime(60_000))

        expect(onTimeUp).toHaveBeenCalled()
    })
})