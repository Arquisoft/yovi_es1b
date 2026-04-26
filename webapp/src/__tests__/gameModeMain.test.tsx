import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const changeLanguageMock = vi.hoisted(() => vi.fn())
const logoutMock = vi.hoisted(() => vi.fn())
const getProfileMock = vi.hoisted(() => vi.fn())

vi.mock('react-dom/client', () => ({
  default: {
    createRoot: vi.fn(() => ({ render: vi.fn() })),
  },
  createRoot: vi.fn(() => ({ render: vi.fn() })),
}))

vi.mock('../screens/GameModeScreen', () => ({
  GameModeScreen: ({
    onSelectMode,
    onLogout,
  }: {
    onSelectMode: (mode: 'bot' | 'multiplayer') => void
    onLogout?: () => Promise<void> | void
  }) => (
    <div>
      <button type="button" onClick={() => onSelectMode('bot')}>select-bot</button>
      <button type="button" onClick={() => onSelectMode('multiplayer')}>select-multiplayer</button>
      <button type="button" onClick={() => void onLogout?.()}>logout</button>
    </div>
  ),
}))

vi.mock('../../i18n', () => ({
  default: {
    changeLanguage: changeLanguageMock,
  },
}))

vi.mock('../services/gameService', () => ({
  gameService: {
    logout: logoutMock,
    getProfile: getProfileMock,
  },
}))

const loadModule = async () => import('../pages/gamemode/main')

const renderGameModeApp = async (ui: Parameters<typeof render>[0]) => {
  let result: ReturnType<typeof render> | undefined
  await act(async () => {
    result = render(ui)
    await Promise.resolve()
    await Promise.resolve()
  })
  return result!
}

describe('gamemode main page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    vi.stubGlobal('location', {
      href: 'http://localhost/gamemode.html',
      origin: 'http://localhost',
      pathname: '/gamemode.html',
    })
    vi.spyOn(window.HTMLVideoElement.prototype, 'play').mockResolvedValue(undefined)
    vi.spyOn(window.HTMLAudioElement.prototype, 'play').mockResolvedValue(undefined)
    getProfileMock.mockResolvedValue({})
    logoutMock.mockResolvedValue(undefined)
  })

  test('redirige al index si no hay usuario guardado', async () => {
    const { GameModePage } = await loadModule()

    await renderGameModeApp(<GameModePage />)

    await waitFor(() => {
      expect((globalThis.location as { href: string }).href).toBe('/index.html')
    })
  })

  test('seleccionar modo guarda sessionStorage y navega a game', async () => {
    localStorage.setItem('yovi_user', 'alice')
    const user = userEvent.setup()
    const { GameModePage } = await loadModule()

    await renderGameModeApp(<GameModePage />)
    await user.click(screen.getByRole('button', { name: /select-multiplayer/i }))

    expect(sessionStorage.getItem('yovi_gamemode')).toBe('multiplayer')
    expect(sessionStorage.getItem('yovi_previous_gamemode')).toBe('multiplayer')
    expect((globalThis.location as { href: string }).href).toBe('/game.html')
  })

  test('sincroniza idioma desde localStorage y perfil sin reescribir storage', async () => {
    localStorage.setItem('yovi_user', 'alice')
    localStorage.setItem('yovi_user_language', 'English')
    getProfileMock.mockResolvedValueOnce({ language: 'Portuguese' })

    const { GameModePage } = await loadModule()
    await renderGameModeApp(<GameModePage />)

    await waitFor(() => {
      expect(getProfileMock).toHaveBeenCalledOnce()
      expect(localStorage.getItem('yovi_user_language')).toBe('English')
      expect(document.documentElement.lang).toBe('pt')
    })
  })

  test('normaliza idiomas no soportados antes de aplicarlos', async () => {
    localStorage.setItem('yovi_user', 'alice')
    getProfileMock.mockResolvedValueOnce({ language: 'French' })

    const { GameModePage } = await loadModule()
    await renderGameModeApp(<GameModePage />)

    await waitFor(() => {
      expect(getProfileMock).toHaveBeenCalledOnce()
      expect(localStorage.getItem('yovi_user_language')).toBeNull()
      expect(document.documentElement.lang).toBe('es')
    })
  })

  test('logout limpia storage y vuelve al index', async () => {
    localStorage.setItem('yovi_user', 'alice')
    localStorage.setItem('yovi_friend_code', 'ABC123')
    localStorage.setItem('yovi_user_icon', 'icon.png')
    localStorage.setItem('yovi_user_language', 'es')
    localStorage.setItem('yovi_user_nickname', 'Ali')
    localStorage.setItem('username', 'alice')
    sessionStorage.setItem('yovi_gamemode', 'bot')
    const user = userEvent.setup()
    const { GameModePage } = await loadModule()

    await renderGameModeApp(<GameModePage />)
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /^logout$/i }))
    })

    expect(logoutMock).toHaveBeenCalledOnce()
    expect(sessionStorage.getItem('yovi_gamemode')).toBeNull()
    expect(localStorage.getItem('yovi_user')).toBeNull()
    expect(localStorage.getItem('yovi_friend_code')).toBeNull()
    expect((globalThis.location as { href: string }).href).toBe('/index.html')
  })
})
