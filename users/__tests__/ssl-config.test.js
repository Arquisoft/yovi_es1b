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
      const origin = 'https://localhost:5173';
      const res = await request(app)
        .options('/any-route')
        .set('Origin', origin); 

      expect(res.status).toBe(204);
      // ✅ CAMBIO: Esperamos que refleje nuestro origen
      expect(res.get('Access-Control-Allow-Origin')).toBe(origin);
    });

    it('debe cubrir el flujo normal (Verde en el next())', async () => {
      const origin = 'https://localhost:5173';
      const res = await request(app)
        .get('/difficulties')
        .set('Origin', origin); 

      // ✅ CAMBIO: Esperamos que refleje nuestro origen
      expect(res.get('Access-Control-Allow-Origin')).toBe(origin);
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
 describe('Swagger Setup', () => {
    it('debe cubrir el error de carga de Swagger si el archivo YAML falla', () => {
      const YAML = require('js-yaml');
      vi.spyOn(YAML, 'load').mockImplementation(() => {
        throw new Error('YAML corrupto o inexistente');
      });
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Llamamos a la función
      setupSwagger({ use: vi.fn() });

      // CORRECCIÓN: Añadimos expect.anything() para el segundo argumento (e.message)
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error al cargar la documentación Swagger'),
        expect.anything()
      );
    });
  });

  // --- COBERTURA CORS Y OPTIONS ---
  describe('Middleware CORS y Pre-flight', () => {
    it('debe responder 204 No Content a las peticiones OPTIONS', async () => {
      const res = await request(app).options('/createuser');
      expect(res.status).toBe(204);
    });

    it('debe incluir los headers de Access-Control en las respuestas', async () => {
      // USAMOS /difficulties porque NO toca la base de datos de Mongo.
      // Así evitamos el error de "Timeout" que te dio antes.
      const res = await request(app).get('/difficulties').set('Origin', 'https://localhost');
      
      expect(res.header['access-control-allow-origin']).toBe('https://localhost');
      expect(res.header['access-control-allow-methods']).toBeDefined();
    });
    it('no debe reflejar origen no permitido', async () => {
      const res = await request(app).options('/createuser').set('Origin', 'https://evil.example');

      expect(res.status).toBe(204);
      expect(res.header['access-control-allow-origin']).toBeUndefined();
    });
  });
});
