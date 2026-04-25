import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
// Importamos la función directamente desde el servicio
const { loadSSLConfig } = require('../users-service.js');

describe('loadSSLConfig - Code Coverage', () => {
  
  beforeEach(() => {
    vi.restoreAllMocks();
    // Importante: stub de NODE_ENV para que no ignore la función por ser un test
    vi.stubEnv('NODE_ENV', 'production');
  });

  it('debe cubrir el bloque de ÉXITO (Cargar certificados)', () => {
    // Forzamos que los archivos EXISTAN
    const existsSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    // Forzamos que la lectura devuelva algo
    const readSpy = vi.spyOn(fs, 'readFileSync').mockReturnValue('mock-data');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = loadSSLConfig();

    // Verificamos que se creó el objeto config
    expect(result).toEqual({ key: 'mock-data', cert: 'mock-data' });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('🔒'));
  });

  it('debe cubrir el bloque CATCH (Error al leer)', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    // Forzamos un error de lectura para que salte al CATCH
    vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('Error de disco simulado');
    });
    
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = loadSSLConfig();

    // Verificamos que entró al catch, logueó y devolvió null
    expect(result).toBeNull();
    expect(errSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('se usará HTTP'));
  });

  it('debe cubrir el "RETURN NULL" (Si los archivos no existen)', () => {
    // Forzamos que los archivos NO EXISTAN
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);

    const result = loadSSLConfig();

    // El flujo salta el IF y llega al final de la función
    expect(result).toBeNull();
  });
});