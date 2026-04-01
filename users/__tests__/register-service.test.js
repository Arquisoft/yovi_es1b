import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import request from 'supertest'

import User from '../models/user.js'

import app from '../users-service.js'

describe('POST /createuser', () => {

    beforeEach(() => {
        // --- ESTO ES LO QUE FALTABA ---
        // Mock de findOne para que el bucle 'while' del friendCode termine rápido
        // Devolvemos 'null' para simular que NO existe el código y es único
        vi.spyOn(User, 'findOne').mockResolvedValue(null) 
        
        // Tu mock original para el guardado
        vi.spyOn(User.prototype, 'save').mockResolvedValue(true)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('crea un usuario y devuelve el mensaje de bienvenida', async () => {
        const res = await request(app)
            .post('/createuser')
            .send({ 
                username: 'testUser', 
                password: 'testPass',
                age: 25,
                country: 'Spain'
            })
            .set('Accept', 'application/json')

        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('message')
        expect(res.body.message).toBe('Hello testUser! Your account has been created!')
    })

    it('devuelve error 400 si faltan campos', async () => {
        const res = await request(app)
            .post('/createuser')
            .send({ username: 'testUser' }) 

        expect(res.status).toBe(400)
        expect(res.body.error).toBe('Username and password are required')
    })

    it('devuelve error 400 si el usuario ya existe', async () => {
        // IMPORTANTE: Mantenemos el findOne en null para que pase el bucle
        vi.spyOn(User, 'findOne').mockResolvedValue(null)
        // Y forzamos el error en el save
        vi.spyOn(User.prototype, 'save').mockRejectedValue(new Error('User already exists'))

        const res = await request(app)
            .post('/createuser')
            .send({ 
                username: 'testUser', 
                password: 'testPass',
                age: 25,
                country: 'Spain'
            })
        
        expect(res.status).toBe(400)
        expect(res.body.error).toBe('User already exists or database error')
    })
})