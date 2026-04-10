/*import { beforeEach, describe, expect, test } from 'vitest'
import { clearSession, getAuthHeaders, getCurrentUser } from '../utils/sessionUtils'

describe('sessionUtils', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  test('getAuthHeaders devuelve Bearer token cuando existe token', () => {
    sessionStorage.setItem('token', 'abc123')

    expect(getAuthHeaders()).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer abc123',
    })
  })

  test('getAuthHeaders devuelve Authorization vacía cuando no hay token', () => {
    expect(getAuthHeaders()).toEqual({
      'Content-Type': 'application/json',
      Authorization: '',
    })
  })

  test('getCurrentUser devuelve username cuando existe en sesión', () => {
    sessionStorage.setItem('username', 'pepe')
    expect(getCurrentUser()).toBe('pepe')
  })

  test('getCurrentUser devuelve cadena vacía cuando no hay username', () => {
    expect(getCurrentUser()).toBe('')
  })

  test('clearSession elimina token y username', () => {
    sessionStorage.setItem('token', 'tok')
    sessionStorage.setItem('username', 'ana')

    clearSession()

    expect(sessionStorage.getItem('token')).toBeNull()
    expect(sessionStorage.getItem('username')).toBeNull()
  })
})
*/