import { describe, it, expect, afterEach, vi } from 'vitest'
import request from 'supertest'

import User from '../models/user.js'
import app from '../users-service.js'
import bcrypt from 'bcryptjs'

describe('POST /login', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('inicia sesión con éxito cuando el usuario y la contraseña son correctos', async () => {
        // Generar una contraseña encriptada simulada
        const hashedPassword = await bcrypt.hash('testPass', 10)

        // cuando vaya a buscar el usuario, directamente se simula que lo encuentra
        const findOneSpy = vi.spyOn(User, 'findOne').mockResolvedValue({
            username: 'testUser',
            password: hashedPassword,
        })

        const res = await request(app)
            .post('/login')
            .send({
                username: 'testUser',
                password: 'testPass',
            })

        expect(res.status).toBe(200)
        expect(res.body.message).toBe('Welcome back, testUser!')
        expect(findOneSpy).toHaveBeenCalledWith({ username: 'testUser' })
    })

    it('devuelve error 401 si la contraseña es incorrecta', async () => {
        // Generar una contraseña encriptada simulada
        const hashedPassword = await bcrypt.hash('testPass', 10)

        // cuando vaya a buscar el usuario, directamente se simula que lo encuentra
        const findOneSpy = vi.spyOn(User, 'findOne').mockResolvedValue({
            username: 'testUser',
            password: hashedPassword,
        })

        const res = await request(app)
            .post('/login')
            .send({
                username: 'testUser',
                password: 'wrongPass',
            })

        expect(res.status).toBe(401)
        expect(res.body.error).toBe('Usuario o contraseña incorrecta')
        expect(findOneSpy).toHaveBeenCalledWith({ username: 'testUser' })
    })

it('maneja correctamente nombres de usuario con espacios y devuelve 401 si no existe', async () => {
    // Simulamos que la base de datos no encuentra nada
    vi.spyOn(User, 'findOne').mockResolvedValue(null);

    const res = await request(app)
        .post('/login')
        .send({
            username: '  usuarioConEspacios  ',
            password: 'password123'
        });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Usuario o contraseña incorrecta');
});

it('debe cubrir el catch de login si la base de datos falla', async () => {
  // Forzamos que findOne lance un error
  vi.spyOn(User, 'findOne').mockImplementationOnce(() => {
    throw new Error('DB Connection Failed');
  });

  const res = await request(app)
    .post('/login')
    .send({ username: 'test', password: 'password' });

  expect(res.status).toBe(500);
  expect(res.body.error).toContain('Error del servidor');
});
})
