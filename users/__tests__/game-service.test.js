import { describe, it, expect, afterEach, vi } from 'vitest'
import request from 'supertest'
import app from '../users-service.js'
import User from '../models/user.js'
import { generateTestToken, withAuthToken } from './test-utils.js'

// Mock global fetch para no llamar a Rust
// Mock global fetch para no llamar a Rust
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const mockRustResponse = (data, ok = true) =>
    Promise.resolve({
        ok,
        status: ok ? 200 : 500,
        json: () => Promise.resolve(data),
        text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
        // SOLUCIÓN: Añadimos el objeto headers para que res.headers.get() no falle
        headers: {
            get: (name) => {
                if (name.toLowerCase() === 'content-type') return 'application/json';
                return null;
            }
        }
    })

describe('Game endpoints (proxy a Rust)', () => {
    const token = generateTestToken()

    afterEach(() => {
        vi.restoreAllMocks()
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

        it('acredita puntuacion fallback si el humano gana y Rust no manda score valido', async () => {
            mockFetch.mockReturnValue(mockRustResponse({
                board: { size: 12, layout: 'B' },
                winner: 0,
                score: 0,
            }))
            const updateSpy = vi.spyOn(User, 'findOneAndUpdate').mockResolvedValue({ username: 'Alice' })
            const aliceToken = generateTestToken({ username: 'Alice', nickname: 'Ali' })

            const res = await withAuthToken(request(app)
                .post('/move')
                .send({
                    cellIndex: 0,
                    username: ' Alice ',
                    difficulty: 'Difícil',
                    boardSize: 12,
                }), aliceToken)

            expect(res.status).toBe(200)
            expect(res.body.score).toBe(600)
            expect(updateSpy).toHaveBeenCalledWith(
                { username: 'Alice' },
                { $inc: { totalScore: 600 } }
            )
        })

        it('devuelve 500 si falla la comunicacion con Rust durante el movimiento', async () => {
            mockFetch.mockRejectedValueOnce(new Error('network down'))

            const res = await withAuthToken(request(app)
                .post('/move')
                .send({ cellIndex: 0, username: 'Alice' }), token)

            expect(res.status).toBe(500)
            expect(res.body.error).toContain('network down')
        })

        it('permite modo invitado sin token y no acredita score en base de datos', async () => {
            mockFetch.mockReturnValue(mockRustResponse({
                board: { size: 6, layout: '......' },
                winner: 0,
                score: 300,
            }))
            const updateSpy = vi.spyOn(User, 'findOneAndUpdate').mockResolvedValue({ username: 'Alice' })

            const res = await request(app)
                .post('/move')
                .send({ cellIndex: 0, username: 'Alice', difficulty: 'Hard', boardSize: 6 })

            expect(res.status).toBe(200)
            expect(res.body.score).toBe(300)
            expect(updateSpy).not.toHaveBeenCalled()
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

        it('propaga el estado si Rust rechaza la rendicion', async () => {
            mockFetch.mockReturnValue(Promise.resolve({
                ok: false,
                status: 503,
                json: () => Promise.resolve({}),
                text: () => Promise.resolve('rust\nfail'),
            }))

            const res = await withAuthToken(request(app)
                .post('/surrender')
                .send({ username: 'Alice', difficulty: 'Easy', boardSize: 6 }), token)

            expect(res.status).toBe(503)
            expect(res.body.error).toMatch(/rendici/i)
        })

        it('devuelve 500 si no puede conectar con Rust al rendirse', async () => {
            mockFetch.mockRejectedValueOnce(new Error('offline'))

            const res = await withAuthToken(request(app)
                .post('/surrender')
                .send({ username: 'Alice', difficulty: 'Easy', boardSize: 6 }), token)

            expect(res.status).toBe(500)
            expect(res.body.error).toContain('offline')
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

        it('redondea el size y envia username a Rust', async () => {
            mockFetch.mockReturnValue(mockRustResponse({ size: 7, layout: '.' }))

            const res = await withAuthToken(request(app)
                .post('/reset')
                .send({ size: 7.9, difficulty: 'Medium', username: 'Alice' }), token)

            expect(res.status).toBe(200)
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/reset'), expect.objectContaining({
                body: JSON.stringify({ size: 7, difficulty: 'Medium', player: 'Alice' }),
            }))
        })

        it('devuelve 500 si Rust falla al resetear', async () => {
            mockFetch.mockReturnValue(Promise.resolve({
                ok: false,
                status: 502,
                json: () => Promise.resolve({}),
                text: () => Promise.resolve('reset fail'),
                headers: { get: () => 'application/json' },
            }))

            const res = await withAuthToken(request(app)
                .post('/reset')
                .send({ size: 6, difficulty: 'Easy' }), token)

            expect(res.status).toBe(500)
            expect(res.body.error).toContain('Rust error: 502')
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

        it('permite consultar dificultades sin token (modo invitado)', async () => {
            mockFetch.mockReturnValue(mockRustResponse(['Easy', 'Medium', 'Hard']))

            const res = await request(app).get('/difficulties')

            expect(res.status).toBe(200)
            expect(res.body).toEqual(['Easy', 'Medium', 'Hard'])
        })
    })

    // ── GET /history ───────────────────────────

    describe('POST /users/purchase-xp', () => {
        it('rechaza cantidades no numericas', async () => {
            const res = await request(app)
                .post('/users/purchase-xp')
                .send({ username: 'Alice', amount: 'abc' })

            expect(res.status).toBe(400)
            expect(res.body.error).toMatch(/cantidad/i)
        })

        it('devuelve 404 si el usuario no existe', async () => {
            vi.spyOn(User, 'findOneAndUpdate').mockResolvedValue(null)

            const res = await request(app)
                .post('/users/purchase-xp')
                .send({ username: 'Alice', amount: 25 })

            expect(res.status).toBe(404)
        })

        it('acredita puntos comprados', async () => {
            vi.spyOn(User, 'findOneAndUpdate').mockResolvedValue({ totalScore: 125 })

            const res = await request(app)
                .post('/users/purchase-xp')
                .send({ username: ' Alice ', amount: 25 })

            expect(res.status).toBe(200)
            expect(res.body.total).toBe(125)
            expect(User.findOneAndUpdate).toHaveBeenCalledWith(
                { username: 'Alice' },
                { $inc: { totalScore: 25 } },
                { new: true }
            )
        })

        it('devuelve 500 si falla la compra', async () => {
            vi.spyOn(User, 'findOneAndUpdate').mockRejectedValue(new Error('db fail'))

            const res = await request(app)
                .post('/users/purchase-xp')
                .send({ username: 'Alice', amount: 25 })

            expect(res.status).toBe(500)
        })
    })

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

        it('propaga error de Rust en historial', async () => {
            mockFetch.mockReturnValue(Promise.resolve({
                ok: false,
                status: 502,
                json: () => Promise.resolve({}),
                text: () => Promise.resolve('history fail'),
                headers: { get: () => 'application/json' },
            }))

            const res = await withAuthToken(request(app)
                .get('/history?username=Alice&page=1'), token)

            expect(res.status).toBe(502)
            expect(res.body.error).toBe('Rust history service error')
        })

        it('devuelve 500 si no puede conectar con Rust para historial', async () => {
            mockFetch.mockRejectedValueOnce(new Error('offline'))

            const res = await withAuthToken(request(app)
                .get('/history?username=Alice&page=1'), token)

            expect(res.status).toBe(500)
            expect(res.body.error).toMatch(/servicio de Rust/i)
        })
    })
})
