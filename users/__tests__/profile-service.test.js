import { describe, it, expect, afterEach, vi } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcryptjs'
import User from '../models/user.js'
import app from '../users-service.js'

describe('Profile endpoints', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('GET /users/profile/:username devuelve perfil con birthDate', async () => {
    const mockUser = {
      username: 'Alice',
      birthDate: new Date('2000-01-01T00:00:00.000Z'),
      language: 'Spain',
      iconName: 'hombre1.png',
      following: [],
      followers: [],
    }

    const query = { populate: vi.fn() }
    query.populate
      .mockImplementationOnce(() => query)
      .mockResolvedValueOnce(mockUser)

    vi.spyOn(User, 'findOne').mockReturnValue(query)

    const res = await request(app).get('/users/profile/Alice')
    expect(res.status).toBe(200)
    expect(res.body.username).toBe('Alice')
    expect(res.body.birthDate).toBeTruthy()
    expect(res.body.language).toBe('Spain')
    expect(res.body.iconName).toBe('hombre1.png')
  })

  it('PATCH /users/profile/:username actualiza language, iconName y birthDate', async () => {
    const mockSave = vi.fn().mockResolvedValue(true)
    const mockUser = {
      username: 'Alice',
      birthDate: new Date('2000-01-01T00:00:00.000Z'),
      language: 'Spain',
      iconName: 'old-icon.png',
      save: mockSave,
    }

    vi.spyOn(User, 'findOne').mockResolvedValue(mockUser)

    const res = await request(app)
      .patch('/users/profile/Alice')
      .send({
        language: 'United Kingdom',
        iconName: 'new-icon.png',
        birthDate: '2001-02-03',
      })

    expect(res.status).toBe(200)
    expect(mockUser.language).toBe('United Kingdom')
    expect(mockUser.iconName).toBe('new-icon.png')
    expect(mockSave).toHaveBeenCalled()
  })

  it('PATCH /users/profile/:username devuelve 400 con birthDate invalida', async () => {
    vi.spyOn(User, 'findOne').mockResolvedValue({
      username: 'Alice',
      save: vi.fn(),
    })

    const res = await request(app)
      .patch('/users/profile/Alice')
      .send({ birthDate: 'not-a-date' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/fecha de nacimiento invalida/i)
  })

  it('POST /users/profile/:username/change-password devuelve 401 si password actual no coincide', async () => {
    const hashed = await bcrypt.hash('realPass123', 10)
    vi.spyOn(User, 'findOne').mockResolvedValue({
      username: 'Alice',
      password: hashed,
      save: vi.fn(),
    })

    const res = await request(app)
      .post('/users/profile/Alice/change-password')
      .send({ currentPassword: 'wrongPass', newPassword: 'newPass123' })

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/no es correcta/i)
  })

  it('POST /users/profile/:username/change-password actualiza password correctamente', async () => {
    const oldHashed = await bcrypt.hash('realPass123', 10)
    const mockUser = {
      username: 'Alice',
      password: oldHashed,
      save: vi.fn().mockResolvedValue(true),
    }
    vi.spyOn(User, 'findOne').mockResolvedValue(mockUser)

    const res = await request(app)
      .post('/users/profile/Alice/change-password')
      .send({ currentPassword: 'realPass123', newPassword: 'newPass123' })

    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/actualizada correctamente/i)
    expect(mockUser.save).toHaveBeenCalled()
    expect(mockUser.password).not.toBe(oldHashed)
    const stillMatchesOld = await bcrypt.compare('realPass123', mockUser.password)
    expect(stillMatchesOld).toBe(false)
    const matchesNew = await bcrypt.compare('newPass123', mockUser.password)
    expect(matchesNew).toBe(true)
  })
})
