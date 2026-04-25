import { describe, it, expect, afterEach, vi } from 'vitest'
import request from 'supertest'
import app from '../users-service.js'
import { generateTestToken, withAuthToken } from './test-utils.js'

// Mock global fetch para no llamar a Rust
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const mockRustResponse = (data, ok = true) =>
    Promise.resolve({
        ok,
        json: () => Promise.resolve(data),
        text: () => Promise.resolve(JSON.stringify(data)),
        status: ok ? 200 : 500,
    })

describe('Game endpoints (proxy a Rust)', () => {
    const token = generateTestToken()

    afterEach(() => {
        vi.clearAllMocks()
    })

    // ── POST /move ─────────────────────────────

    describe('POST /move', () => {
        it('reenvía el movimiento a Rust y devuelve la respuesta', async () => {
            mockFetch.mockReturnValue(mockRustResponse({
                board: { size: 6, layout: '......' },
                winner: null,
            }))

            const res = await withAuthToken(request(app)
                .post('/move')
                .send({ cellIndex: 0, username: 'Alice' }), token)

            expect(res.status).toBe(200)
            expect(res.body.winner).toBeNull()
            expect(res.body.responseFromRust).toBeDefined()
        })

        it('devuelve 500 si Rust falla', async () => {
            mockFetch.mockReturnValue(mockRustResponse('Error', false))

            const res = await withAuthToken(request(app)
                .post('/move')
                .send({ cellIndex: 0, username: 'Alice' }), token)

            expect(res.status).toBe(500)
        })
    })

    // ── POST /surrender ────────────────────────

    describe('POST /surrender', () => {
        it('registra la rendición correctamente', async () => {
            mockFetch.mockReturnValue(mockRustResponse({ message: 'ok' }))

            const res = await withAuthToken(request(app)
                .post('/surrender')
                .send({ username: 'Alice', difficulty: 'Easy', boardSize: 6 }), token)

            expect(res.status).toBe(200)
            expect(res.body.message).toMatch(/rendici/i)
        })
    })

    // ── POST /reset ────────────────────────────

    describe('POST /reset', () => {
        it('resetea el tablero correctamente', async () => {
            mockFetch.mockReturnValue(mockRustResponse({ size: 6, layout: '......' }))

            const res = await withAuthToken(request(app)
                .post('/reset')
                .send({ size: 6, difficulty: 'Easy' }), token)

            expect(res.status).toBe(200)
            expect(res.body.responseFromRust).toBeDefined()
        })

        it('usa tamaño por defecto si el size no es válido', async () => {
            mockFetch.mockReturnValue(mockRustResponse({ size: 5, layout: '.' }))

            const res = await withAuthToken(request(app)
                .post('/reset')
                .send({ size: 999, difficulty: 'Easy' }), token)

            expect(res.status).toBe(200)
        })
    })

    // ── GET /difficulties ──────────────────────

    describe('GET /difficulties', () => {
        it('devuelve las dificultades de Rust', async () => {
            mockFetch.mockReturnValue(mockRustResponse(['Easy', 'Medium', 'Hard']))

            const res = await withAuthToken(request(app).get('/difficulties'), token)

            expect(res.status).toBe(200)
            expect(res.body).toEqual(['Easy', 'Medium', 'Hard'])
        })

        it('devuelve 500 si Rust falla', async () => {
            mockFetch.mockReturnValue(mockRustResponse('Error', false))

            const res = await withAuthToken(request(app).get('/difficulties'), token)

            expect(res.status).toBe(500)
        })
    })

    // ── GET /history ───────────────────────────

    describe('GET /history', () => {
        it('devuelve el historial correctamente', async () => {
            mockFetch.mockReturnValue(mockRustResponse({
                data: [{ result: 'win' }],
                total_pages: 1,
                page: 1,
            }))

            const res = await withAuthToken(request(app)
                .get('/history?username=Alice&page=1'), token)

            expect(res.status).toBe(200)
            expect(res.body.data).toBeDefined()
        })

        it('devuelve 400 si no se pasa username', async () => {
            const res = await withAuthToken(request(app).get('/history'), token)
            expect(res.status).toBe(400)
        })

        it('añade el filtro result a la URL de Rust si se pasa', async () => {
            mockFetch.mockReturnValue(mockRustResponse({ data: [], total_pages: 1, page: 1 }))

            await withAuthToken(request(app).get('/history?username=Alice&page=1&result=win'), token)

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('result=win')
            )
        })
    })
})