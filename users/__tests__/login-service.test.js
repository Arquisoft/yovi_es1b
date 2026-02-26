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
        vi.spyOn(User, 'findOne').mockResolvedValue({
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
    })

    it('devuelve error 401 si la contraseña es incorrecta', async () => {
        // Generar una contraseña encriptada simulada
        const hashedPassword = await bcrypt.hash('testPass', 10)

        // cuando vaya a buscar el usuario, directamente se simula que lo encuentra
        vi.spyOn(User, 'findOne').mockResolvedValue({
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
        expect(res.body.error).toBe('Contraseña incorrecta')
    })
})