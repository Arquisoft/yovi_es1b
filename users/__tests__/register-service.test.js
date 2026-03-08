import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import request from 'supertest'

import User from '../models/user.js'

import app from '../users-service.js'

describe('POST /createuser', () => {

    beforeEach(() => {
        vi.spyOn(User.prototype, 'save').mockResolvedValue(true) // no se inserta realmente en la bbdd, pero se simula que la operación de guardado es exitosa
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
            .send({ username: 'testUser' }) // Falta password

        expect(res.status).toBe(400)
        expect(res.body.error).toBe('Username and password are required')
    })

    it('devuelve error 400 si el usuario ya existe', async () => {
        // Esto vigila si alguien crea un usuario y pulse el boton guardar
        vi.spyOn(User.prototype, 'save').mockRejectedValue(new Error('User already exists')) // Obliga a fallar inmediatamente.

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