import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import request from 'supertest'

import User from '../models/user.js'

// 3. AHORA IMPORTAMOS LA APP
import app from '../users-service.js'

describe('POST /createuser', () => {
    beforeEach(() => {
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

        // Ajustado a los mensajes exactos de tu users-service.js
        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('message')
        expect(res.body.message).toBe('Hello testUser! Your account has been created!')
    })

    it('devuelve error 400 si faltan campos', async () => {
        const res = await request(app)
            .post('/createuser')
            .send({ username: 'testUUser' }) // Falta password

        expect(res.status).toBe(400)
        expect(res.body.error).toBe('Username and password are required')
    })
})