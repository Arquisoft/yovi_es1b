import { describe, test, expect } from 'vitest'
import { getBoardDimensionFromSizeChoice, patchTriangularLayoutCell } from '../utils/boardUtils'
import type { SizeChoice } from '../types/game'

describe('getBoardDimensionFromSizeChoice', () => {

    test('devuelve 6 para "TamaÃ±o 6x6x6"', () => {
        expect(getBoardDimensionFromSizeChoice('Pequeño' as SizeChoice)).toBe(6)
    })

    test('devuelve 9 para "TamaÃ±o 9x9x9"', () => {
        expect(getBoardDimensionFromSizeChoice('Mediano' as SizeChoice)).toBe(9)
    })

    test('devuelve 12 para "TamaÃ±o 12x12x12"', () => {
        expect(getBoardDimensionFromSizeChoice('Grande' as SizeChoice)).toBe(12)
    })

    test('devuelve null si el choice es null', () => {
        expect(getBoardDimensionFromSizeChoice(null)).toBeNull()
    })

    test('devuelve null si el choice no coincide con ningÃºn tamaÃ±o', () => {
        expect(getBoardDimensionFromSizeChoice('TamaÃ±o 5x5x5' as SizeChoice)).toBeNull()
    })
})

describe('patchTriangularLayoutCell', () => {

    // â”€â”€ Casos normales â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('coloca una B en el Ã­ndice 0 de un tablero 3x3', () => {
        const result = patchTriangularLayoutCell('......', 3, 0, 'B')
        expect(result).toBe('B/../...')
    })

    test('coloca una R en el Ã­ndice 2 de un tablero 3x3', () => {
        const result = patchTriangularLayoutCell('......', 3, 2, 'R')
        expect(result).toBe('./.R/...')
    })

    test('coloca una B en el Ãºltimo Ã­ndice del tablero', () => {
        const result = patchTriangularLayoutCell('......', 3, 5, 'B')
        expect(result).toBe('./../..B')
    })

    test('reconstruye correctamente las filas triangulares', () => {
        // Tablero size=3: filas de 1,2,3 celdas â†’ total 6 celdas
        const result = patchTriangularLayoutCell('......', 3, 3, 'B')
        expect(result.split('/').map(r => r.length)).toEqual([1, 2, 3])
    })

    // â”€â”€ Casos lÃ­mite â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('devuelve el layout sin cambios si el Ã­ndice es negativo', () => {
        const layout = '../..'
        expect(patchTriangularLayoutCell(layout, 3, -1, 'B')).toBe(layout)
    })

    test('devuelve el layout sin cambios si el Ã­ndice supera el total de celdas', () => {
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

    // â”€â”€ Layout con separadores â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('maneja correctamente un layout que ya viene con separadores /', () => {
        const result = patchTriangularLayoutCell('./../', 3, 1, 'R')
        expect(result).toBe('./R./...')
    })

    test('funciona con tablero de tamaÃ±o 1', () => {
        const result = patchTriangularLayoutCell('.', 1, 0, 'B')
        expect(result).toBe('B')
    })
})
