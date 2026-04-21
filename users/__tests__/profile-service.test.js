import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import User from '../models/user.js'
import app from '../users-service.js'
import { generateTestToken, withAuthToken } from './test-utils.js'

describe('Profile endpoints', () => {
  const token = generateTestToken()

  beforeEach(() => {
    // Evitamos bloqueos de Mongoose por falta de conexión real
    mongoose.set('bufferCommands', false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('GET /users/profile/:username devuelve perfil con birthDate', async () => {
    const mockUser = {
      username: 'Alice',
      nickname: 'Ali',
      birthDate: new Date('2000-01-01T00:00:00.000Z'),
      language: 'Spain',
      iconName: 'hombre1.png'
    }

    // Mock para la cadena .findOne().populate().populate()
    // Como en tu código el GET está comentado, este test asume que lo activarás
    const mockQuery = {
      populate: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(mockUser),
      // Si usas el estilo "thenable" (await directamente sobre el query):
      then: vi.fn().mockImplementation(function(onFulfilled) {
        return Promise.resolve(mockUser).then(onFulfilled);
      })
    }

    vi.spyOn(User, 'findOne').mockReturnValue(mockQuery)

    const res = await withAuthToken(request(app).get('/users/profile/Alice'), token)

    expect(res.status).toBe(200)
    expect(res.body.username).toBe('Alice')
    // Comprobamos que contenga la fecha sin importar el formato ISO completo
    expect(res.body.birthDate).toContain('2000-01-01')
    expect(res.body.language).toBe('Spain')
  })

  it('PATCH /users/profile/:username actualiza language, iconName y birthDate', async () => {
    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      username: 'Alice',
      nickname: 'Ali',
      language: 'Spain',
      iconName: 'old-icon.png',
      save: vi.fn().mockResolvedValue(true),
    }

    // Primera llamada: busca al usuario para editarlo
    vi.spyOn(User, 'findOne').mockResolvedValue(mockUser)

    const res = await withAuthToken(request(app)
      .patch('/users/profile/Alice')
      .send({
        language: 'United Kingdom',
        iconName: 'new-icon.png',
        birthDate: '2001-02-03',
      }), token)

    expect(res.status).toBe(200)
    expect(mockUser.language).toBe('United Kingdom')
    expect(mockUser.iconName).toBe('new-icon.png')
    // Verificamos que el objeto Date se creó correctamente
    expect(mockUser.birthDate).toBeInstanceOf(Date)
    expect(mockUser.save).toHaveBeenCalled()
  })

  it('PATCH /users/profile/:username devuelve 400 con birthDate invalida', async () => {
    vi.spyOn(User, 'findOne').mockResolvedValue({
      username: 'Alice',
      save: vi.fn(),
    })

    const res = await withAuthToken(request(app)
      .patch('/users/profile/Alice')
      .send({ birthDate: 'esto-no-es-una-fecha' }), token)

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/fecha de nacimiento invalida/i)
  })

  it('POST /users/profile/:username/change-password devuelve 401 si password actual no coincide', async () => {
    const hashed = await bcrypt.hash('realPass123', 10)
    vi.spyOn(User, 'findOne').mockResolvedValue({
      username: 'Alice',
      password: hashed,
    })

    const res = await withAuthToken(request(app)
      .post('/users/profile/Alice/change-password')
      .send({ 
        currentPassword: 'wrongPass', 
        newPassword: 'newPass123' 
      }), token)

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/la contraseña actual no es correcta/i)
  })

  it('POST /users/profile/:username/change-password actualiza password correctamente', async () => {
    const oldHashed = await bcrypt.hash('realPass123', 10)
    const mockUser = {
      username: 'Alice',
      password: oldHashed,
      save: vi.fn().mockResolvedValue(true),
    }
    
    vi.spyOn(User, 'findOne').mockResolvedValue(mockUser)

    const res = await withAuthToken(request(app)
      .post('/users/profile/Alice/change-password')
      .send({ 
        currentPassword: 'realPass123', 
        newPassword: 'newPass123' 
      }), token)

    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/contraseña actualizada correctamente/i)
    expect(mockUser.save).toHaveBeenCalled()
    
    // Verificamos que la contraseña se haya hasheado (no es el texto plano)
    expect(mockUser.password).not.toBe('newPass123')
    const isMatch = await bcrypt.compare('newPass123', mockUser.password)
    expect(isMatch).toBe(true)
  })
})