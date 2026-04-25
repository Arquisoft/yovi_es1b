import { beforeEach, describe, expect, test } from 'vitest'
import {
  getGameIdentity,
  mapUiDifficultyToBackend,
  resolveIconFromAssets,
} from '../utils/gamePageUtils'

describe('gamePageUtils', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('mapUiDifficultyToBackend traduce las dificultades conocidas', () => {
    expect(mapUiDifficultyToBackend('Fácil')).toBe('facil')
    expect(mapUiDifficultyToBackend('Medio')).toBe('medio')
    expect(mapUiDifficultyToBackend('Difícil')).toBe('dificil')
  })

  test('mapUiDifficultyToBackend usa facil por defecto', () => {
    expect(mapUiDifficultyToBackend('Desconocida')).toBe('facil')
  })

  test('resolveIconFromAssets conserva URLs y rutas válidas', () => {
    const iconModules = {
      '../../assets/icon/hombre1.png': '/assets/hombre1.png',
    }

    expect(resolveIconFromAssets('https://example.com/icon.png', iconModules)).toBe('https://example.com/icon.png')
    expect(resolveIconFromAssets('/icons/custom.png', iconModules)).toBe('/icons/custom.png')
  })

  test('resolveIconFromAssets resuelve nombres de archivo contra assets', () => {
    const iconModules = {
      '../../assets/icon/hombre1.png': '/assets/hombre1.png',
      '../../assets/icon/mujer1.png': '/assets/mujer1.png',
    }

    expect(resolveIconFromAssets('hombre1.png', iconModules)).toBe('/assets/hombre1.png')
  })

  test('getGameIdentity devuelve Invitado cuando corresponde', () => {
    expect(getGameIdentity(true, 'alice')).toEqual({
      displayName: 'Invitado',
      friendCode: '',
      username: 'Invitado',
    })
  })

  test('getGameIdentity usa nickname y friendCode guardados', () => {
    localStorage.setItem('yovi_user_nickname', 'Ali')
    localStorage.setItem('yovi_friend_code', 'ABC123')

    expect(getGameIdentity(false, 'alice')).toEqual({
      displayName: 'Ali',
      friendCode: 'ABC123',
      username: 'alice',
    })
  })
})
