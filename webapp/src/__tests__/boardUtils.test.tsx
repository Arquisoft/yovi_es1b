import { describe, test, expect } from 'vitest'
import { getBoardDimensionFromSizeChoice, patchTriangularLayoutCell } from '../utils/boardUtils'
import type { SizeChoice } from '../types/game'

describe('getBoardDimensionFromSizeChoice', () => {

    test('devuelve 6 para "Tamaño 6x6x6"', () => {
        expect(getBoardDimensionFromSizeChoice('Pequeño' as SizeChoice)).toBe(6)
    })

    test('devuelve 9 para "Tamaño 9x9x9"', () => {
        expect(getBoardDimensionFromSizeChoice('Mediano' as SizeChoice)).toBe(9)
    })

    test('devuelve 12 para "Tamaño 12x12x12"', () => {
        expect(getBoardDimensionFromSizeChoice('Grande' as SizeChoice)).toBe(12)
    })

    test('devuelve null si el choice es null', () => {
        expect(getBoardDimensionFromSizeChoice(null)).toBeNull()
    })

    test('devuelve null si el choice no coincide con ningún tamaño', () => {
        expect(getBoardDimensionFromSizeChoice('Tamaño 5x5x5' as SizeChoice)).toBeNull()
    })
})

describe('patchTriangularLayoutCell', () => {

    // ── Casos normales ────────────────────────

    test('coloca una B en el índice 0 de un tablero 3x3', () => {
        const result = patchTriangularLayoutCell('......', 3, 0, 'B')
        expect(result).toBe('B/../...')
    })

    test('coloca una R en el índice 2 de un tablero 3x3', () => {
        const result = patchTriangularLayoutCell('......', 3, 2, 'R')
        expect(result).toBe('./.R/...')
    })

    test('coloca una B en el último índice del tablero', () => {
        const result = patchTriangularLayoutCell('......', 3, 5, 'B')
        expect(result).toBe('./../..B')
    })

    test('reconstruye correctamente las filas triangulares', () => {
        // Tablero size=3: filas de 1,2,3 celdas → total 6 celdas
        const result = patchTriangularLayoutCell('......', 3, 3, 'B')
        expect(result.split('/').map(r => r.length)).toEqual([1, 2, 3])
    })

    // ── Casos límite ──────────────────────────

    test('devuelve el layout sin cambios si el índice es negativo', () => {
        const layout = '../..'
        expect(patchTriangularLayoutCell(layout, 3, -1, 'B')).toBe(layout)
    })

    test('devuelve el layout sin cambios si el índice supera el total de celdas', () => {
        const layout = '../..'
        expect(patchTriangularLayoutCell(layout, 3, 99, 'B')).toBe(layout)
    })

    test('devuelve el layout sin cambios si size es 0', () => {
        const layout = '../..'
        expect(patchTriangularLayoutCell(layout, 0, 0, 'B')).toBe(layout)
    })

    test('devuelve el layout sin cambios si size es negativo', () => {
        const layout = '../..'
        expect(patchTriangularLayoutCell(layout, -3, 0, 'B')).toBe(layout)
    })

    test('devuelve el layout sin cambios si size no es finito', () => {
        const layout = '../..'
        expect(patchTriangularLayoutCell(layout, Infinity, 0, 'B')).toBe(layout)
    })

    // ── Layout con separadores ────────────────

    test('maneja correctamente un layout que ya viene con separadores /', () => {
        const result = patchTriangularLayoutCell('./../', 3, 1, 'R')
        expect(result).toBe('./R./...')
    })

    test('funciona con tablero de tamaño 1', () => {
        const result = patchTriangularLayoutCell('.', 1, 0, 'B')
        expect(result).toBe('B')
    })
})
