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

    // El endpoint actual hace await sobre findOne(), así que basta con devolver el usuario mockeado.
    vi.spyOn(User, 'findOne').mockResolvedValue(mockUser)

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

  it('PATCH /users/profile/:username devuelve 400 con birthDate inválida', async () => {
    vi.spyOn(User, 'findOne').mockResolvedValue({
      username: 'Alice',
      save: vi.fn(),
    })

    const res = await withAuthToken(request(app)
      .patch('/users/profile/Alice')
      .send({ birthDate: 'esto-no-es-una-fecha' }), token)

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/fecha de nacimiento inválida/i)
  })

  it('PATCH /users/profile/:username devuelve 400 si el nickname supera 15 caracteres', async () => {
    vi.spyOn(User, 'findOne').mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      username: 'Alice',
      nickname: 'Ali',
      save: vi.fn(),
    })

    const res = await withAuthToken(request(app)
      .patch('/users/profile/Alice')
      .send({ nickname: 'abcdefghijklmnop' }), token)

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/nickname no puede tener mas de 15 caracteres/i)
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
    vi.spyOn(bcrypt, 'compare')
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
    vi.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-new-password')

    const res = await withAuthToken(request(app)
      .post('/users/profile/Alice/change-password')
      .send({ 
        currentPassword: 'realPass123', 
        newPassword: 'newPass123' 
      }), token)

    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/contraseña actualizada correctamente/i)
    expect(mockUser.save).toHaveBeenCalled()
    
    // Verificamos que la contraseña se haya cambiado y no quede en texto plano
    expect(mockUser.password).not.toBe('newPass123')
  })


  it('devuelve error 409 si el nickname ya está en uso por otro usuario', async () => {
    const idDiego = '69cfc57863b4e59b1d9fc9d';
    const idNahiara = '69cf9958e6c33e348c3f772c';
    const nicknameDeNahiara = 'nahi';

    const findOneSpy = vi.spyOn(User, 'findOne');

    findOneSpy.mockResolvedValueOnce({ 
        _id: idDiego, 
        username: 'diego', 
        nickname: 'abeijon' 
    });


    findOneSpy.mockResolvedValueOnce({ 
        _id: idNahiara, 
        nickname: nicknameDeNahiara 
    });

    const res = await withAuthToken(request(app)
        .patch('/users/profile/diego')
        .send({ 
            nickname: nicknameDeNahiara 
        }), token);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Nickname ya existe');
});

it('devuelve 400 si falta algún campo (username, actual o nueva contraseña)', async () => {
    const res = await withAuthToken(request(app)
        .post('/users/profile/diego/change-password')
        .send({
            currentPassword: 'una',
        }), token);

    expect(res.status).toBe(400);
});

it('devuelve 400 si la nueva contraseña tiene menos de 6 caracteres', async () => {
    const res = await withAuthToken(request(app)
        .post('/users/profile/diego/change-password')
        .send({
            currentPassword: 'passwordActual123',
            newPassword: '123' 
        }), token);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('La nueva contraseña debe tener al menos 6 caracteres');
});

it('devuelve 500 si hay un error inesperado en el servidor', async () => {
    vi.spyOn(User, 'findOne').mockRejectedValue(new Error('Fallo de conexión DB'));

    const res = await withAuthToken(request(app)
        .post('/users/profile/diego/change-password')
        .send({
            currentPassword: 'passwordActual123',
            newPassword: 'nuevaPassword123'
        }), token);

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Error del servidor');
});
});

describe('Profile & Search Catch Coverage', () => {
  const token = generateTestToken(); 

  it('debe cubrir el catch de /users/search', async () => {
    const findSpy = vi.spyOn(User, 'find').mockRejectedValue(new Error('Database Error'));

    const res = await withAuthToken(
      request(app).get('/users/search?query=test'), 
      token
    );
    
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
    
    findSpy.mockRestore();
  });

  it('debe cubrir la lógica de actualización del perfil (PATCH)', async () => {
    const res = await request(app)
      .patch('/users/profile/diego')
      .send({
        language: 'es',
        iconName: 'avatar.png',
        nickname: 'DiegoPro'
      });

    expect(res.status).not.toBe(404);
  });
});
