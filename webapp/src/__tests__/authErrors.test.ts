import { describe, expect, test } from 'vitest'
import { isServerOrDatabaseError, SERVER_ERROR_MESSAGE } from '../utils/authErrors'

describe('authErrors', () => {
  test('reconoce errores de servidor y base de datos', () => {
    expect(isServerOrDatabaseError('Database unavailable', 400)).toBe(true)
    expect(isServerOrDatabaseError('Error de servidor', 400)).toBe(true)
    expect(isServerOrDatabaseError('connection reset by peer', 400)).toBe(true)
    expect(isServerOrDatabaseError(undefined, 503)).toBe(true)
  })

  test('no marca como servidor errores normales', () => {
    expect(isServerOrDatabaseError('Usuario incorrecto', 400)).toBe(false)
    expect(isServerOrDatabaseError('', 404)).toBe(false)
  })

  test('expone el mensaje base compartido', () => {
    expect(SERVER_ERROR_MESSAGE).toContain('Error de los servidores')
  })
})
