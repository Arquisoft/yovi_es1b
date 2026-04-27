import { beforeEach, describe, expect, test } from 'vitest'
import {
  activateRegisteredSession,
  clearGuestSession,
  clearSession,
  enableGuestSession,
  getAuthHeaders,
  getCurrentUser,
  isGuestSession,
  persistAuthToken,
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

  test('getAuthHeaders devuelve Authorization vacia cuando no hay token', () => {
    expect(getAuthHeaders()).toEqual({
      'Content-Type': 'application/json',
      Authorization: '',
    })
  })

  test('getCurrentUser normaliza el username guardado', () => {
    sessionStorage.setItem('username', '  pepe  ')
    expect(getCurrentUser()).toBe('pepe')
  })

  test('getCurrentUser limpia valores inseguros', () => {
    sessionStorage.setItem('username', '<script>')
    expect(getCurrentUser()).toBe('')
    expect(sessionStorage.getItem('username')).toBeNull()
  })

  test('clearSession elimina token username y marca de invitado', () => {
    sessionStorage.setItem('token', 'tok')
    sessionStorage.setItem('username', 'ana')
    enableGuestSession()

    clearSession()

    expect(sessionStorage.getItem('token')).toBeNull()
    expect(sessionStorage.getItem('username')).toBeNull()
    expect(isGuestSession()).toBe(false)
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

  test('persistAuthToken normaliza y guarda tokens seguros', () => {
    expect(persistAuthToken('  header.payload-signature_123  ')).toBe(true)
    expect(sessionStorage.getItem('token')).toBe('header.payload-signature_123')
  })

  test('persistAuthToken rechaza tokens inseguros y limpia el anterior', () => {
    sessionStorage.setItem('token', 'token-viejo')

    expect(persistAuthToken('<script>alert(1)</script>')).toBe(false)
    expect(sessionStorage.getItem('token')).toBeNull()
  })

  test('guest session helpers gestionan la marca de invitado', () => {
    expect(isGuestSession()).toBe(false)

    enableGuestSession()
    expect(isGuestSession()).toBe(true)
    expect(sessionStorage.getItem('username')).toBe('Invitado')
    expect(getCurrentUser()).toBe('Invitado')

    clearGuestSession()
    expect(isGuestSession()).toBe(false)
    expect(sessionStorage.getItem('username')).toBeNull()
  })

  test('getCurrentUser recupera usuario invitado si falta username pero existe marca guest', () => {
    sessionStorage.setItem('yovi_guest', '1')

    expect(getCurrentUser()).toBe('Invitado')
    expect(sessionStorage.getItem('username')).toBe('Invitado')
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

  test('persistUserSession rechaza usuario o friendCode invalidos', () => {
    expect(persistUserSession('   ', { friendCode: 'FRIEND-1' })).toBe(false)
    expect(persistUserSession('ana', { friendCode: '<bad>' })).toBe(false)
    expect(localStorage.length).toBe(0)
  })
})
