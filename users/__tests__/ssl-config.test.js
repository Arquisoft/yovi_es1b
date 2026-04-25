import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';

// Importamos la app y las funciones
const app = require('../users-service.js');
const { loadSSLConfig, normalizeIconName, setupSwagger } = require('../users-service.js');

describe('Cobertura de Infraestructura y Middlewares', () => {

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv('NODE_ENV', 'production');
  });

  // --- COBERTURA SSL  ---
  describe('loadSSLConfig', () => {
    it('debe cubrir el éxito de carga (Verde en el IF y return config)', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue('data');
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const config = loadSSLConfig();

      expect(config).not.toBeNull();
      expect(logSpy).toHaveBeenCalled();
    });

    it('debe cubrir el bloque CATCH (Verde en el catch y console.error)', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('Disk Error');
      });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = loadSSLConfig();

      expect(result).toBeNull();
      expect(errorSpy).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('se usará HTTP por defecto'));
    });

    it('debe cubrir el return null final (Verde en la última línea)', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      expect(loadSSLConfig()).toBeNull();
    });
  });

  // --- COBERTURA CORS / OPTIONS  ---
  describe('CORS Middleware', () => {
    it('debe cubrir el branch de OPTIONS (Verde en res.sendStatus(204))', async () => {
      const res = await request(app).options('/createuser');
      
      expect(res.status).toBe(204);
      expect(res.header['access-control-allow-origin']).toBe('*');
    });

    it('debe cubrir el flujo normal (Verde en el next())', async () => {
      // Llamamos a cualquier ruta GET simple
      const res = await request(app).get('/difficulties');
      expect(res.header['access-control-allow-origin']).toBe('*');
    });
  });

  // --- COBERTURA UTILS ---
  describe('normalizeIconName', () => {
    it('cubre todas las líneas de normalización', () => {
      expect(normalizeIconName(null)).toBe('SinAvatar.png');
      expect(normalizeIconName('folder\\test.png')).toBe('test.png');
    });
  });

  // --- COBERTURA SWAGGER ---
  it('debe cubrir el catch de Swagger', () => {
    const YAML = require('js-yaml');
    vi.spyOn(YAML, 'load').mockImplementation(() => { throw new Error('fail') });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    setupSwagger({ use: vi.fn() });
    expect(logSpy).toHaveBeenCalled();
  });
});