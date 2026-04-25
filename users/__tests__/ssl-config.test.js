import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';

// 1. IMPORTANTE: Añade setupSwagger aquí arriba
// La parte de arriba de tu test debe quedar así:
const app = require('../users-service.js');
const { loadSSLConfig, normalizeIconName, setupSwagger } = require('../users-service.js');

describe('Infraestructura y Utilidades de Users Service', () => {

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv('NODE_ENV', 'production');
  });

  // --- COBERTURA SSL ---
  describe('loadSSLConfig', () => {
    it('debe cubrir el éxito de carga y el log del candado', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue('cert-data');
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const config = loadSSLConfig();

      expect(config).toEqual({ key: 'cert-data', cert: 'cert-data' });
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('🔒'));
    });

    it('debe cubrir el bloque CATCH y el log de advertencia genérico', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('Error de lectura');
      });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const config = loadSSLConfig();

      expect(config).toBeNull();
      expect(errorSpy).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('se usará HTTP por defecto'));
    });

    it('debe cubrir el return null si no encuentra archivos', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      expect(loadSSLConfig()).toBeNull();
    });
  });

  // --- COBERTURA NORMALIZACIÓN ICONOS ---
  describe('normalizeIconName', () => {
    it('devuelve SinAvatar.png si el valor es nulo o vacío', () => {
      expect(normalizeIconName(null)).toBe('SinAvatar.png');
      expect(normalizeIconName('')).toBe('SinAvatar.png');
    });

    it('reemplaza barras y limpia la ruta dejando solo el nombre', () => {
      expect(normalizeIconName('folder\\icon.png')).toBe('icon.png');
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
      const res = await request(app).get('/difficulties');
      
      expect(res.header['access-control-allow-origin']).toBe('*');
      expect(res.header['access-control-allow-methods']).toBeDefined();
    });
  });
});