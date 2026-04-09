import { beforeEach, describe, expect, test } from 'vitest'
import { clearGuestSession, clearSession, enableGuestSession, getAuthHeaders, getCurrentUser, isGuestSession } from '../utils/sessionUtils'

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
    sessionStorage.setItem('yovi_guest', '1')

    clearSession()

    expect(sessionStorage.getItem('token')).toBeNull()
    expect(sessionStorage.getItem('username')).toBeNull()
    expect(sessionStorage.getItem('yovi_guest')).toBeNull()
  })

  test('guest session helpers gestionan la marca de invitado', () => {
    expect(isGuestSession()).toBe(false)

    enableGuestSession()
    expect(isGuestSession()).toBe(true)

    clearGuestSession()
    expect(isGuestSession()).toBe(false)
  })
})
