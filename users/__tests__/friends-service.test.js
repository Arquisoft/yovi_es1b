import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import request from 'supertest'
import User from '../models/user.js'
import app from '../users-service.js' // Asegúrate de que este sea el nombre correcto

describe('Social & Friends Endpoints', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    // --- TEST BÚSQUEDA ---
    describe('GET /users/search', () => {
        it('debe devolver una lista de usuarios que coincidan con la búsqueda', async () => {
            const mockUsers = [
                { username: 'Alice', score: 100 },
                { username: 'Alicia', score: 50 }
            ];

            // Mockear la cadena .find().select()
            const findSpy = vi.spyOn(User, 'find').mockReturnValue({
                select: vi.fn().mockResolvedValue(mockUsers)
            });

            const res = await request(app).get('/users/search?query=Ali');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
            expect(res.body[0].username).toBe('Alice');
            expect(findSpy).toHaveBeenCalledWith(expect.objectContaining({
                username: expect.any(Object) // Verifica que se pasa el regex
            }));
        });
    });

    // --- TEST FOLLOW ---
    describe('POST /users/follow', () => {
        it('debe permitir a un usuario seguir a otro', async () => {
            // Mock de los objetos usuario con los métodos pull, push e includes
            const mockMe = { 
                _id: 'id_drus', 
                username: 'Drus', 
                following: { 
                    includes: vi.fn().mockReturnValue(false), 
                    push: vi.fn() 
                },
                save: vi.fn().mockResolvedValue(true)
            };
            const mockTarget = { 
                _id: 'id_alice', 
                username: 'Alice', 
                followers: { push: vi.fn() },
                save: vi.fn().mockResolvedValue(true)
            };

            // Mock de findOne: la primera vez encuentra al objetivo, la segunda a mí
            const findOneSpy = vi.spyOn(User, 'findOne')
                .mockResolvedValueOnce(mockTarget) // para 'Alice'
                .mockResolvedValueOnce(mockMe);    // para 'Drus'

            const res = await request(app)
                .post('/users/follow')
                .send({ follower: 'Drus', following: 'Alice' });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Ahora sigues a Alice');
            expect(mockMe.following.push).toHaveBeenCalledWith('id_alice');
            expect(mockMe.save).toHaveBeenCalled();
            expect(mockTarget.save).toHaveBeenCalled();
        });

        it('debe devolver error si el usuario a seguir no existe', async () => {
            vi.spyOn(User, 'findOne').mockResolvedValue(null);

            const res = await request(app)
                .post('/users/follow')
                .send({ follower: 'Drus', following: 'NoExiste' });

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Usuario no encontrado');
        });
    });

    // --- TEST PERFIL ---
    describe('GET /users/profile/:username', () => {
        it('debe devolver los datos del perfil con seguidores populados', async () => {
            const mockUserData = {
                username: 'Alice',
                age: 25,
                country: 'Spain',
                following: ['amigo1'],
                followers: ['seguidor1']
            };

            // Mockear la cadena encadenada .findOne().populate().populate()
            vi.spyOn(User, 'findOne').mockReturnValue({
                populate: vi.fn().mockReturnThis(), // El primer populate devuelve el objeto para seguir encadenando
                exec: vi.fn().mockResolvedValue(mockUserData) // Si usas exec() al final
            });
            
            // Nota: Si tu controlador no usa .exec(), el mock es directo:
            vi.spyOn(User, 'findOne').mockReturnValue({
                populate: vi.fn().mockReturnThis(),
                then: vi.fn().mockImplementation(callback => callback(mockUserData))
            });

            // Si el controlador es simple (await User.findOne(...).populate().populate()):
            vi.spyOn(User, 'findOne').mockReturnValue({
                populate: vi.fn().mockImplementation(() => ({
                    populate: vi.fn().mockResolvedValue(mockUserData)
                }))
            });

            const res = await request(app).get('/users/profile/Alice');

            expect(res.status).toBe(200);
            expect(res.body.username).toBe('Alice');
        });
    });
});