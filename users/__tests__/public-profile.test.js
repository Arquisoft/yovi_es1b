import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../users-service.js';
import User from '../models/user.js';
import Friendship from '../models/friendship.js';
import { generateTestToken, withAuthToken } from './test-utils.js';

describe('GET /users/public-profile/:username', () => {
  const token = generateTestToken();
  
  beforeEach(() => {
    vi.restoreAllMocks();
    // Mock global de fetch para que no intente salir a internet
    global.fetch = vi.fn();
    // Mock global de Friendship para evitar el timeout si falta el requester
    vi.spyOn(Friendship, 'findOne').mockResolvedValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('debe cubrir el caso de "Usuario no encontrado" (404)', async () => {
    vi.spyOn(User, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(null)
    });

    const res = await withAuthToken(request(app).get('/users/public-profile/inexistente'), token);
    expect(res.status).toBe(404);
  });

  it('debe cubrir el "catch" de Rust si el servicio falla', async () => {
    vi.spyOn(User, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue({ username: 'diego', nickname: 'abeijon' })
    });

    // Forzamos el error de red en Rust
    global.fetch.mockRejectedValue(new Error('Rust Offline'));

    const res = await withAuthToken(request(app).get('/users/public-profile/diego'), token);

    expect(res.status).toBe(200);
    expect(res.body.username).toBe('diego');
  });

  it('debe cubrir la relación "self" y éxito de Rust', async () => {
    vi.spyOn(User, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue({ username: 'diego', nickname: 'abeijon' })
    });

    global.fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ wins: 5, losses: 1, total: 6, total_score: 100 })
    });

    const res = await withAuthToken(request(app).get('/users/public-profile/diego?requester=diego'), token);
    expect(res.status).toBe(200);
  });
});
