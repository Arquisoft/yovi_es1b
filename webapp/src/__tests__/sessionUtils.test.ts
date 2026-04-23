import { beforeEach, describe, expect, test } from 'vitest'
import {
  activateRegisteredSession,
  clearGuestSession,
  clearSession,
  enableGuestSession,
  getAuthHeaders,
  getCurrentUser,
  isGuestSession,
  persistUserSession,
} from '../utils/sessionUtils'

describe('sessionUtils', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
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

  test('clearSession no falla aunque no haya datos guardados', () => {
    expect(() => clearSession()).not.toThrow()
    expect(sessionStorage.length).toBe(0)
  })

  test('activateRegisteredSession sustituye la sesion por el usuario nuevo', () => {
    sessionStorage.setItem('token', 'tok-viejo')
    sessionStorage.setItem('username', 'usuario-viejo')
    sessionStorage.setItem('yovi_guest', '1')

    const result = activateRegisteredSession('  usuario-nuevo  ')

    expect(result).toBe(true)
    expect(sessionStorage.getItem('token')).toBeNull()
    expect(sessionStorage.getItem('yovi_guest')).toBeNull()
    expect(sessionStorage.getItem('username')).toBe('usuario-nuevo')
  })

  test('activateRegisteredSession no cambia la sesion si el nombre esta vacio', () => {
    sessionStorage.setItem('token', 'tok')
    sessionStorage.setItem('username', 'usuario-viejo')

    expect(activateRegisteredSession('   ')).toBe(false)
    expect(sessionStorage.getItem('token')).toBe('tok')
    expect(sessionStorage.getItem('username')).toBe('usuario-viejo')
  })

  test('guest session helpers gestionan la marca de invitado', () => {
    expect(isGuestSession()).toBe(false)

    enableGuestSession()
    expect(isGuestSession()).toBe(true)

    clearGuestSession()
    expect(isGuestSession()).toBe(false)
  })

  test('clearGuestSession deja la sesión sin marca aunque ya estuviera vacía', () => {
    clearGuestSession()
    expect(isGuestSession()).toBe(false)
  })

  test('persistUserSession guarda y limpia los campos opcionales', () => {
    const result = persistUserSession('  ana  ', {
      friendCode: '#FRIEND-1',
      icon: 'avatar.png',
      language: 'es',
      nickname: '',
    })

    expect(result).toBe(true)
    expect(localStorage.getItem('yovi_user')).toBe('ana')
    expect(localStorage.getItem('yovi_friend_code')).toBe('FRIEND-1')
    expect(localStorage.getItem('yovi_user_icon')).toBe('avatar.png')
    expect(localStorage.getItem('yovi_user_language')).toBe('es')
    expect(localStorage.getItem('yovi_user_nickname')).toBeNull()
  })

  test('persistUserSession acepta friendCode con almohadilla inicial', () => {
    const result = persistUserSession('ana', {
      friendCode: '#ABC123',
    })

    expect(result).toBe(true)
    expect(localStorage.getItem('yovi_friend_code')).toBe('ABC123')
  })

  test('persistUserSession no guarda nada si el nombre está vacío', () => {
    expect(
      persistUserSession('   ', {
        friendCode: 'FRIEND-1',
        icon: 'avatar.png',
      })
    ).toBe(false)

    expect(localStorage.length).toBe(0)
  })
})
