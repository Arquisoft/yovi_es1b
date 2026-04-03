import { describe, it, expect, afterEach, vi } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'

// Importamos el modelo y la app
import User from '../models/user.js'
import Friendship from '../models/friendship.js'
import app from '../users-service.js'

describe('Social & Friends Endpoints (Mocks)', () => {

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

            const res = await request(app).get('/users/search?query=Ali');

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
            const res = await request(app).get(`/users/search?query=${encodeURIComponent('#ALIC12')}`);

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

            const res = await request(app)
                .post('/users/follow')
                .send({ follower: 'Drus', following: 'Alice' });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Solicitud enviada correctamente');
        });

        it('debe devolver 400 si ya existe una solicitud', async () => {
            // Simulamos que ya existe una relación
            vi.spyOn(Friendship, 'findOne').mockResolvedValue({ status: 'pending' });

            const res = await request(app)
                .post('/users/follow')
                .send({ follower: 'Drus', following: 'Alice' });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Ya existe una solicitud o amistad');
        });
    });

});