import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import request from 'supertest'
import User from '../models/user.js'
import app from '../users-service.js'

describe('POST /createuser', () => {

    beforeEach(() => {
        // 1. Mock de findOne para que el bucle 'while' del friendCode termine.
        // Devolvemos 'null' para simular que no existe el username ni el friendCode.
        vi.spyOn(User, 'findOne').mockResolvedValue(null) 
        
        // 2. Mock para el guardado exitoso
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
                nickname: 'testNick', // Nuevo campo
                password: 'testPass',
                birthDate: '2000-01-01', // Nuevo campo
                language: 'Spain' // Cambiado de country a language
            })
            .set('Accept', 'application/json')

        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('message')
        expect(res.body.message).toBe('Hello testUser! Your account has been created!')
        expect(res.body).toHaveProperty('friendCode') // Verificamos que devuelve el código
    })

    it('devuelve error 400 si faltan campos', async () => {
        const res = await request(app)
            .post('/createuser')
            .send({ username: 'testUser' }) 

        expect(res.status).toBe(400)
        // El mensaje ahora debe incluir todos los campos obligatorios
        expect(res.body.error).toBe('Username, nickname, password, language and birthDate are required')
    })

    it('devuelve error 409 si el username ya existe', async () => {
        vi.spyOn(User, 'findOne').mockResolvedValue({ username: 'testUser' })

        const res = await request(app)
            .post('/createuser')
            .send({
                username: 'testUser',
                nickname: 'anotherNick',
                password: 'testPass',
                birthDate: '2000-01-01',
                language: 'Spain'
            })

        expect(res.status).toBe(409)
        expect(res.body.error).toBe('Username already exists')
    })

    it('devuelve error 400 si el nickname supera 15 caracteres', async () => {
        const res = await request(app)
            .post('/createuser')
            .send({
                username: 'testUser',
                nickname: 'abcdefghijklmnop',
                password: 'testPass',
                birthDate: '2000-01-01',
                language: 'Spain'
            })

        expect(res.status).toBe(400)
        expect(res.body.error).toBe('Nickname must be at most 15 characters')
    })

    it('devuelve error 400 si hay un error de base de datos al guardar', async () => {
        // findOne devuelve null para pasar las validaciones previas y el bucle
        vi.spyOn(User, 'findOne').mockResolvedValue(null)
        // Forzamos el error en el save() para entrar en el catch
        vi.spyOn(User.prototype, 'save').mockRejectedValue(new Error('DB Error'))

        const res = await request(app)
            .post('/createuser')
            .send({ 
                username: 'testUser', 
                nickname: 'testNick',
                password: 'testPass',
                birthDate: '2000-01-01',
                language: 'Spain'
            })
        
        expect(res.status).toBe(400)
        expect(res.body.error).toBe('User already exists or database error')
    })

    it('devuelve error 400 si la fecha de nacimiento no es válida (NaN)', async () => {
    const res = await request(app)
        .post('/createuser')
        .send({
            username: 'userFechaFail',
            nickname: 'nick',
            password: 'pass',
            birthDate: 'esto-no-es-una-fecha', // Provoca el fallo
            language: 'Spain'
        });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('birthDate is invalid');
    });

    it('responde con 204 a una petición OPTIONS', async () => {
    const res = await request(app)
        .options('/createuser');

    expect(res.status).toBe(204);   
    });

    it('debe cubrir el catch de registro ante un error inesperado', async () => {
  vi.spyOn(User.prototype, 'save').mockImplementationOnce(() => {
    throw new Error('Save failed');
  });

  const res = await request(app)
    .post('/createuser')
    .send({ 
        username: 'new', 
        nickname: 'new', 
        password: '123', 
        birthDate: '2000-01-01',
        language: 'Spain' 
    });

  expect(res.status).toBe(400); 
  expect(res.body.error).toBe("User already exists or database error");
});

    
})
