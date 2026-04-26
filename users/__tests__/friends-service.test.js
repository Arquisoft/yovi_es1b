import { describe, it, expect, afterEach, vi } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'

// Importamos el modelo y la app
import User from '../models/user.js'
import Friendship from '../models/friendship.js'
import app from '../users-service.js'
import { generateTestToken, withAuthToken } from './test-utils.js'

describe('Social & Friends Endpoints (Mocks)', () => {
    const token = generateTestToken()

    afterEach(() => {
        vi.restoreAllMocks()
    })

    // --- TEST GET /users/search ---
    describe('GET /users/search', () => {
        it('debe devolver una lista de usuarios cuando la búsqueda es exitosa', async () => {
            const mockUsers = [{ username: 'Alice', icon: 'smile', friendCode: 'ALIC12' }];

            vi.spyOn(User, 'find').mockReturnValue({
                select: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue(mockUsers)
            });

            const res = await withAuthToken(request(app).get('/users/search?query=Ali'), token);

            expect(res.status).toBe(200);
            expect(res.body[0].username).toBe('Alice');
        });

        it('debe buscar por friendCode si la query empieza por #', async () => {
            // 1. Limpiamos cualquier rastro del test anterior
            vi.restoreAllMocks();

            // 2. Creamos el nuevo espía
            const spy = vi.spyOn(User, 'find').mockReturnValue({
                select: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue([{ username: 'Alice' }])
            });

            // 3. Importante: encodeURIComponent para asegurar que el '#' viaje bien en la URL
            const res = await withAuthToken(request(app).get(`/users/search?query=${encodeURIComponent('#ALIC12')}`), token);

            // 4. Verificamos el estado y la llamada
            expect(res.status).toBe(200);
            expect(spy).toHaveBeenCalledWith({ friendCode: 'ALIC12' });
        });
    });

    // --- TEST POST /users/follow ---
    describe('POST /users/follow', () => {
        it('debe permitir enviar una solicitud de amistad', async () => {
            // Simulamos que NO existe una relación previa
            vi.spyOn(Friendship, 'findOne').mockResolvedValue(null);
            
            // Simulamos el save del prototipo de Friendship
            vi.spyOn(Friendship.prototype, 'save').mockResolvedValue({
                users: ['Drus', 'Alice'],
                status: 'pending'
            });

            const res = await withAuthToken(request(app)
                .post('/users/follow')
                .send({ follower: 'Drus', following: 'Alice' }), token);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Solicitud enviada correctamente');
        });

        it('debe devolver 400 si ya existe una solicitud', async () => {
            // Simulamos que ya existe una relación
            vi.spyOn(Friendship, 'findOne').mockResolvedValue({ status: 'pending' });

            const res = await withAuthToken(request(app)
                .post('/users/follow')
                .send({ follower: 'Drus', following: 'Alice' }), token);

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Ya existe una solicitud o amistad');
        });
    });

    // ── GET /friends ───────────────────────────

    describe('GET /friends', () => {
        it('devuelve lista de amigos aceptados', async () => {
            vi.spyOn(Friendship, 'find').mockResolvedValue([
                { users: ['Alice', 'Bob'], status: 'accepted' },
            ])

            const res = await withAuthToken(request(app).get('/friends?username=Alice'), token)

            expect(res.status).toBe(200)
            expect(res.body[0].name).toBe('Bob')
            expect(res.body[0].status).toBe('online')
        })

        it('devuelve 400 si no se pasa username', async () => {
            const res = await withAuthToken(request(app).get('/friends'), token)
            expect(res.status).toBe(400)
        })

        it('devuelve 500 si falla la consulta de amigos', async () => {
            vi.spyOn(Friendship, 'find').mockRejectedValue(new Error('db friends fail'))

            const res = await withAuthToken(request(app).get('/friends?username=Alice'), token)

            expect(res.status).toBe(500)
            expect(res.body.error).toContain('db friends fail')
        })
    })

    // ── GET /friends/requests ──────────────────

    describe('GET /friends/requests', () => {
        it('devuelve solicitudes pendientes', async () => {
            vi.spyOn(Friendship, 'find').mockResolvedValue([
                { users: ['Bob', 'Alice'], status: 'pending', _id: 'req1' },
            ])

            const res = await withAuthToken(request(app).get('/friends/requests?username=Alice'), token)

            expect(res.status).toBe(200)
            expect(res.body[0].sender).toBe('Bob')
            expect(res.body[0].id).toBe('req1')
        })

        it('devuelve 500 si falla la consulta de solicitudes', async () => {
            vi.spyOn(Friendship, 'find').mockRejectedValue(new Error('db requests fail'))

            const res = await withAuthToken(request(app).get('/friends/requests?username=Alice'), token)

            expect(res.status).toBe(500)
            expect(res.body.error).toContain('db requests fail')
        })
    })

    // ── POST /friends/respond ──────────────────

    describe('POST /friends/respond', () => {
        it('acepta una solicitud de amistad', async () => {
            vi.spyOn(Friendship, 'findByIdAndUpdate').mockResolvedValue({
                _id: 'req1',
                status: 'accepted',
            })

            const res = await withAuthToken(request(app)
                .post('/friends/respond')
                .send({ requestId: 'req1', action: 'accepted' }), token)

            expect(res.status).toBe(200)
            expect(res.body.message).toMatch(/ahora sois amigos/i)
        })

        it('rechaza una solicitud de amistad', async () => {
            vi.spyOn(Friendship, 'findByIdAndDelete').mockResolvedValue(true)

            const res = await withAuthToken(request(app)
                .post('/friends/respond')
                .send({ requestId: 'req1', action: 'rejected' }), token)

            expect(res.status).toBe(200)
            expect(res.body.message).toMatch(/rechazada/i)
        })

        it('devuelve 500 si falla al responder una solicitud', async () => {
            vi.spyOn(Friendship, 'findByIdAndUpdate').mockRejectedValue(new Error('db respond fail'))

            const res = await withAuthToken(request(app)
                .post('/friends/respond')
                .send({ requestId: 'req1', action: 'accepted' }), token)

            expect(res.status).toBe(500)
            expect(res.body.error).toContain('db respond fail')
        })
    })

    describe('POST /friends/cancel', () => {
        it('cancela una solicitud pendiente', async () => {
            vi.spyOn(Friendship, 'findOneAndDelete').mockResolvedValue({ _id: 'req1' })

            const res = await withAuthToken(request(app)
                .post('/friends/cancel')
                .send({ follower: 'Alice', following: 'Bob' }), token)

            expect(res.status).toBe(200)
            expect(res.body.message).toMatch(/cancelada/i)
            expect(Friendship.findOneAndDelete).toHaveBeenCalledWith({
                users: { $all: ['Alice', 'Bob'] },
                status: 'pending',
            })
        })

        it('devuelve 500 si falla al cancelar solicitud', async () => {
            vi.spyOn(Friendship, 'findOneAndDelete').mockRejectedValue(new Error('db cancel fail'))

            const res = await withAuthToken(request(app)
                .post('/friends/cancel')
                .send({ follower: 'Alice', following: 'Bob' }), token)

            expect(res.status).toBe(500)
            expect(res.body.error).toContain('db cancel fail')
        })
    })
});
