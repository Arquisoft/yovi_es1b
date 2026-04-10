import { describe, expect, test } from 'vitest'
import { isServerOrDatabaseError, SERVER_ERROR_MESSAGE } from '../utils/authErrors'

describe('authErrors', () => {
  test('reconoce errores de servidor, base de datos y conexión', () => {
    expect(isServerOrDatabaseError('Database unavailable', 400)).toBe(true)
    expect(isServerOrDatabaseError('Base de datos caída', 400)).toBe(true)
    expect(isServerOrDatabaseError('Error de servidor', 400)).toBe(true)
    expect(isServerOrDatabaseError('connection reset by peer', 400)).toBe(true)
    expect(isServerOrDatabaseError('Conexión perdida', 400)).toBe(true)
    expect(isServerOrDatabaseError(undefined, 503)).toBe(true)
  })

  test('no marca como servidor errores normales', () => {
    expect(isServerOrDatabaseError('Usuario incorrecto', 400)).toBe(false)
    expect(isServerOrDatabaseError('', 404)).toBe(false)
    expect(isServerOrDatabaseError(undefined, 400)).toBe(false)
  })

  test('expone el mensaje base compartido', () => {
    expect(SERVER_ERROR_MESSAGE).toContain('Error de los servidores')
  })
})
