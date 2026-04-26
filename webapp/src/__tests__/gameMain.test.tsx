import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { ReactNode } from 'react'

const gameServiceMocks = {
  getDifficulties: vi.fn(),
  getProfile: vi.fn(),
  getHistory: vi.fn(),
  logout: vi.fn(),
  addXP: vi.fn(),
}

const gameLogicMocks = {
  boardData: { size: 5, turn: 0, players: ['B', 'R'], layout: '.....' },
  winner: null as number | null,
  setBoardData: vi.fn(),
  setWinner: vi.fn(),
  executeHumanMove: vi.fn(),
  executeAutoMove: vi.fn(),
  resetGame: vi.fn(),
  surrender: vi.fn(),
}

let triggerTimeUp: (() => void) | null = null
const multiplayerInstances = vi.hoisted(() => [] as Array<Record<string, unknown>>)
let locationReplaceMock: ReturnType<typeof vi.fn>

const renderGameApp = async (ui: Parameters<typeof render>[0]) => {
  let result: ReturnType<typeof render> | undefined
  await act(async () => {
    result = render(ui)
    await Promise.resolve()
    await Promise.resolve()
  })
  return result!
}

vi.mock('react-dom/client', () => ({
  default: {
    createRoot: vi.fn(() => ({ render: vi.fn() })),
  },
  createRoot: vi.fn(() => ({ render: vi.fn() })),
}))

vi.mock('../screens/GameScreen', () => ({
  default: (props: Record<string, unknown>) => (
    <div>
      <button type="button" onClick={() => (props.onChangeDifficulty as (value: string) => void)('Difícil')}>difficulty</button>
      <button type="button" onClick={() => (props.onChangeSize as (value: string) => void)('Grande')}>size</button>
      <button type="button" onClick={() => (props.onResetGame as () => void)()}>reset</button>
      <button type="button" onClick={() => (props.onEndGame as () => Promise<void>)()}>end</button>
      <button type="button" onClick={() => (props.onAddFriend as () => void)()}>add-friend</button>
      <button type="button" onClick={() => (props.onViewProfile as () => void)()}>view-profile</button>
      <button type="button" onClick={() => (props.onOpenSettings as () => void)()}>settings</button>
      <button type="button" onClick={() => (props.onOpenTutorial as () => void)()}>tutorial</button>
      <button type="button" onClick={() => (props.onFetchHistory as () => void)()}>history</button>
      <button type="button" onClick={() => (props.onExit as () => void)()}>exit</button>
      <button type="button" onClick={() => (props.onCellClick as (index: number) => void)(3)}>cell</button>
      <button type="button" onClick={() => (props.onGoToModeMenu as () => void)?.()}>mode-menu</button>
      <button type="button" onClick={() => (props.onScoreButtonClick as () => void)?.()}>score-store</button>
    </div>
  ),
}))

vi.mock('../components/layout/MenuBackgroundShell', () => ({
  MenuBackgroundShell: ({ children }: { children: (background: {
    audioRef: { current: null }
    isVideoPaused: boolean
    musicVolume: number
    setIsVideoPaused: (value: boolean) => void
    setMusicVolume: (value: number) => void
    setShowSettings: (value: boolean) => void
    showSettings: boolean
    videoRef: { current: null }
  }) => ReactNode }) => {
    const { useState } = require('react') as typeof import('react')
    const [showSettings, setShowSettings] = useState(false)
    const [musicVolume, setMusicVolume] = useState(0.4)
    const [isVideoPaused, setIsVideoPaused] = useState(false)

    return (
      <div data-testid="menu-chrome" data-settings="mock">
        {children({
          audioRef: { current: null },
          isVideoPaused,
          musicVolume,
          setIsVideoPaused,
          setMusicVolume,
          setShowSettings,
          showSettings,
          videoRef: { current: null },
        })}
        {showSettings && (
          <div role="dialog" aria-label="Configuración">
            <label>
              volumen
              <input
                aria-label="volumen"
                type="range"
                value={Math.round(musicVolume * 100)}
                onChange={(event) => setMusicVolume(Number(event.target.value) / 100)}
              />
            </label>
            <label>
              video
              <input
                aria-label="video"
                type="checkbox"
                checked={!isVideoPaused}
                onChange={(event) => setIsVideoPaused(!event.target.checked)}
              />
            </label>
            <button type="button" onClick={() => setShowSettings(false)}>cerrar</button>
          </div>
        )}
      </div>
    )
  },
}))

vi.mock('../components/modals/SelectionModals', () => ({
  SelectionModals: ({
    onDifficultySelect,
    onSizeSelect,
    onDifficultyCancel,
    onSizeCancel,
  }: {
    onDifficultySelect: (value: string) => void
    onSizeSelect: (value: string) => void
    onDifficultyCancel: () => void
    onSizeCancel: () => void
  }) => (
    <div>
      <button type="button" onClick={() => onDifficultySelect('Difícil')}>select-difficulty</button>
      <button type="button" onClick={() => onSizeSelect('Grande')}>select-size</button>
      <button type="button" onClick={onDifficultyCancel}>cancel-difficulty</button>
      <button type="button" onClick={onSizeCancel}>cancel-size</button>
    </div>
  ),
}))

vi.mock('../components/modals/HistoryModal', () => ({
  HistoryModal: ({
    isOpen,
    onClose,
    onPageChange,
    onFilterChange,
  }: {
    isOpen: boolean
    onClose: () => void
    onPageChange: (page: number) => void
    onFilterChange: (filter: string) => void
  }) => (
    <div data-testid="history-modal">
      {String(isOpen)}
      <button type="button" onClick={() => onPageChange(2)}>history-page</button>
      <button type="button" onClick={() => onFilterChange('win')}>history-filter</button>
      <button type="button" onClick={onClose}>history-close</button>
    </div>
  ),
}))

vi.mock('../components/modals/ResultModal', () => ({
  ResultModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    <div data-testid="result-modal">
      {String(isOpen)}
      <button type="button" onClick={onClose}>result-close</button>
    </div>
  ),
}))

vi.mock('../components/modals/PublicProfileModal', () => ({
  PublicProfileModal: ({ username }: { username: string }) => <div data-testid="public-profile">{username}</div>,
}))

vi.mock('../components/modals/GuestAccessModal', () => ({
  GuestAccessModal: ({
    reason,
    onGoLogin,
    onGoRegister,
  }: {
    reason: string | null
    onGoLogin: () => void
    onGoRegister: () => void
  }) => (
    <div>
      <div data-testid="guest-reason">{reason ?? 'none'}</div>
      <button type="button" onClick={onGoLogin}>go-login</button>
      <button type="button" onClick={onGoRegister}>go-register</button>
    </div>
  ),
}))

vi.mock('../screens/ProfileScreen', () => ({
  ProfileScreen: ({ isOpen }: { isOpen: boolean }) => <div data-testid="profile-screen">{String(isOpen)}</div>,
}))

vi.mock('../screens/TutorialScreen', () => ({
  TutorialScreen: ({ isOpen }: { isOpen: boolean }) => <div data-testid="tutorial-screen">{String(isOpen)}</div>,
}))

vi.mock('../components/modals/FriendsPanel', () => ({
  FriendsPanel: ({
    onTriggerPublicProfile,
    onInviteFriend,
  }: {
    onTriggerPublicProfile: (value: string) => void
    onInviteFriend?: (value: string) => void
  }) => (
    <div>
      <button type="button" onClick={() => onTriggerPublicProfile('friend-user')}>trigger-public-profile</button>
      <button type="button" onClick={() => onInviteFriend?.('rival-user')}>invite-friend</button>
    </div>
  ),
}))

vi.mock('../components/modals/PayPalStore', () => ({
  PayPalStore: ({
    isOpen,
    onClose,
    onSuccess,
  }: {
    isOpen: boolean
    onClose: () => void
    onSuccess: (points: number) => Promise<void>
  }) => (
    <div data-testid="paypal-store">
      {String(isOpen)}
      <button type="button" onClick={() => onSuccess(25)}>paypal-success</button>
      <button type="button" onClick={onClose}>paypal-close</button>
    </div>
  ),
}))

vi.mock('../hooks/useGameLogic', () => ({
  useGameLogic: () => gameLogicMocks,
}))

vi.mock('../hooks/useGameTimer', () => ({
  useGameTimer: (_handleTimeUp: () => void) => {
    triggerTimeUp = _handleTimeUp
    return {
      timeLeft: 12,
      isVisible: true,
      startTimer: vi.fn(),
      stopTimer: vi.fn(),
      setIsVisible: vi.fn(),
    }
  },
}))

vi.mock('../services/gameService', () => ({
  gameService: gameServiceMocks,
}))

vi.mock('../strategies/MultiplayerStrategy', () => ({
  MultiplayerStrategy: vi.fn().mockImplementation(function MockStrategy(config: Record<string, unknown>) {
    const instance = {
      config,
      initialize: vi.fn().mockResolvedValue(undefined),
      dispose: vi.fn(),
      surrender: vi.fn().mockResolvedValue(undefined),
      onCellClick: vi.fn().mockResolvedValue(undefined),
      challengePlayer: vi.fn(),
      acceptChallenge: vi.fn(),
      setMatchId: vi.fn(),
    }
    multiplayerInstances.push(instance)
    return instance
  }),
}))

const loadGameMain = async () => import('../pages/game/main')

describe('game main entrypoint', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn> | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    window.history.pushState({}, '', '/game.html')
    locationReplaceMock = vi.fn()
    vi.stubGlobal('location', {
      href: 'http://localhost/game.html',
      origin: 'http://localhost',
      pathname: '/game.html',
      replace: locationReplaceMock,
    })
    vi.spyOn(window.crypto, 'getRandomValues').mockImplementation((array) => {
      ;(array as Uint32Array)[0] = 0
      return array
    })
    vi.spyOn(window.HTMLVideoElement.prototype, 'play').mockResolvedValue(undefined)
    vi.spyOn(window.HTMLVideoElement.prototype, 'pause').mockImplementation(() => {})
    vi.spyOn(window.HTMLAudioElement.prototype, 'play').mockResolvedValue(undefined)
    vi.spyOn(window.HTMLAudioElement.prototype, 'pause').mockImplementation(() => {})
    gameServiceMocks.getDifficulties.mockResolvedValue(['Easy', 'Hard'])
    gameServiceMocks.getProfile.mockResolvedValue({ iconName: 'hombre1.png' })
    gameServiceMocks.getHistory.mockResolvedValue({ data: [], total_pages: 1, page: 1 })
    gameServiceMocks.logout.mockResolvedValue({})
    gameServiceMocks.addXP.mockResolvedValue({})
    gameLogicMocks.executeHumanMove.mockResolvedValue({ responseFromRust: null, winner: null })
    gameLogicMocks.executeAutoMove.mockResolvedValue({ responseFromRust: null, winner: null })
    gameLogicMocks.resetGame.mockResolvedValue(null)
    gameLogicMocks.surrender.mockResolvedValue(undefined)
    gameLogicMocks.setBoardData.mockReset()
    gameLogicMocks.setWinner.mockReset()
    triggerTimeUp = null
    multiplayerInstances.length = 0
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubGlobal('confirm', vi.fn(() => true))
  })

  afterEach(() => {
    consoleErrorSpy?.mockRestore()
    consoleErrorSpy = null
  })

  test('redirige al index cuando no hay usuario y no es invitado', async () => {
    localStorage.removeItem('yovi_user')
    sessionStorage.removeItem('yovi_guest')

    const { GameApp } = await loadGameMain()
    await renderGameApp(<GameApp />)

    await waitFor(() => {
      expect((globalThis.location as { href: string }).href).toBe('/index.html')
    })
  })

  test('renderiza la partida y conecta callbacks principales', async () => {
    localStorage.setItem('yovi_user', 'alice')
    localStorage.setItem('yovi_user_icon', 'hombre1.png')
    const user = userEvent.setup()

    const { GameAppContent } = await loadGameMain()
    await renderGameApp(<GameAppContent isGuestMode={false} storedUsername="alice" />)

    await waitFor(() => {
      expect(gameServiceMocks.getDifficulties).toHaveBeenCalled()
      expect(gameServiceMocks.getProfile).toHaveBeenCalled()
    })

    expect(localStorage.getItem('yovi_user_icon')).toBeTruthy()
    await act(async () => {
      triggerTimeUp?.()
    })
    expect(gameLogicMocks.executeAutoMove).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /select-difficulty/i }))
    await user.click(screen.getByRole('button', { name: /select-size/i }))
    await user.click(screen.getByRole('button', { name: /reset/i }))
    await user.click(screen.getByRole('button', { name: /^end$/i }))
    await user.click(screen.getByRole('button', { name: /add-friend/i }))
    await user.click(screen.getByRole('button', { name: /trigger-public-profile/i }))
    await user.click(screen.getByRole('button', { name: /view-profile/i }))
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.click(screen.getByRole('button', { name: /tutorial/i }))
    await user.click(screen.getByRole('button', { name: /^history$/i }))
    await user.click(screen.getByRole('button', { name: /cell/i }))
    await user.click(screen.getByRole('button', { name: /exit/i }))

    expect(gameLogicMocks.executeHumanMove).toHaveBeenCalled()
    expect(gameLogicMocks.executeAutoMove).toHaveBeenCalled()
    expect(gameLogicMocks.resetGame).toHaveBeenCalled()
    expect(gameLogicMocks.surrender).toHaveBeenCalled()
    expect(screen.getByTestId('public-profile').textContent).toBe('friend-user')
    expect(screen.getByTestId('tutorial-screen').textContent).toBe('true')
    expect(screen.getByTestId('profile-screen').textContent).toBe('true')
  })

  test('al ganar una jugada abre el modal de resultado', async () => {
    localStorage.setItem('yovi_user', 'alice')
    const user = userEvent.setup()

    gameLogicMocks.executeHumanMove.mockResolvedValueOnce({
      responseFromRust: null,
      winner: 0,
      score: 42,
    })

    const { GameAppContent } = await loadGameMain()
    await renderGameApp(<GameAppContent isGuestMode={false} storedUsername="alice" />)

    await user.click(screen.getByRole('button', { name: /cell/i }))

    await waitFor(() => {
      expect(gameLogicMocks.executeHumanMove).toHaveBeenCalled()
      expect(screen.getByTestId('result-modal').textContent).toContain('true')
    })
  })

  test('al pedir historial carga datos y abre el modal', async () => {
    localStorage.setItem('yovi_user', 'alice')
    const user = userEvent.setup()

    gameServiceMocks.getHistory.mockResolvedValueOnce({
      data: [
        {
          _id: { $oid: '1' },
          date: '2026-03-18T10:00:00Z',
          opponent: 'pro_bot',
          board_size: 6,
          difficulty: 'Hard',
          result: 'Victoria',
        },
      ],
      total_pages: 2,
      page: 1,
    })

    const { GameAppContent } = await loadGameMain()
    await renderGameApp(<GameAppContent isGuestMode={false} storedUsername="alice" />)

    await user.click(screen.getByRole('button', { name: /^history$/i }))

    await waitFor(() => {
      expect(gameServiceMocks.getHistory).toHaveBeenCalledWith(1, null)
      expect(screen.getByTestId('history-modal').textContent).toContain('true')
    })
  })

  test('controla historial, tienda, ajustes y cierres de modales', async () => {
    localStorage.setItem('yovi_user', 'alice')
    const user = userEvent.setup()

    const { GameAppContent } = await loadGameMain()
    await renderGameApp(<GameAppContent isGuestMode={false} storedUsername="alice" />)

    await user.click(screen.getByRole('button', { name: /^history$/i }))
    await user.click(screen.getByRole('button', { name: /history-page/i }))
    await user.click(screen.getByRole('button', { name: /history-filter/i }))
    await user.click(screen.getByRole('button', { name: /history-close/i }))

    expect(gameServiceMocks.getHistory).toHaveBeenCalledWith(2, null)
    expect(gameServiceMocks.getHistory).toHaveBeenCalledWith(1, 'win')

    await user.click(screen.getByRole('button', { name: /score-store/i }))
    expect(screen.getByTestId('paypal-store').textContent).toContain('true')
    await user.click(screen.getByRole('button', { name: /paypal-success/i }))
    expect(gameServiceMocks.addXP).toHaveBeenCalledWith(25)
    await user.click(screen.getByRole('button', { name: /paypal-close/i }))

    await user.click(screen.getByRole('button', { name: /settings/i }))
    const dialogs = screen.getAllByRole('dialog')
    const settingsDialog = dialogs.find((dialog) =>
      within(dialog).queryByText(/Configuración de elementos de fondo/i)
    )
    expect(settingsDialog).toBeTruthy()
    if (!settingsDialog) throw new Error('No se encontró el diálogo de configuración')
    await user.click(within(settingsDialog).getByLabelText(/Video en movimiento/i))
    fireEvent.change(within(settingsDialog).getByLabelText(/Volumen de la música/i), { target: { value: '50' } })
    await user.click(within(settingsDialog).getByRole('button', { name: /Cerrar/i }))

    gameLogicMocks.executeHumanMove.mockResolvedValueOnce({ responseFromRust: null, winner: 1, score: 0 })
    await user.click(screen.getByRole('button', { name: /cell/i }))
    await waitFor(() => expect(screen.getByTestId('result-modal').textContent).toContain('true'))
    await user.click(screen.getByRole('button', { name: /result-close/i }))
  })

  test('en modo invitado muestra el prompt de acceso', async () => {
    localStorage.setItem('yovi_user', 'alice')
    const user = userEvent.setup()

    const { GameAppContent } = await loadGameMain()
    await renderGameApp(<GameAppContent isGuestMode={true} storedUsername="alice" />)

    await user.click(screen.getByRole('button', { name: /add-friend/i }))
    expect(screen.getByTestId('guest-reason').textContent).toBe('amigos')

    await user.click(screen.getByRole('button', { name: /view-profile/i }))
    expect(screen.getByTestId('guest-reason').textContent).toBe('perfil')

    await user.click(screen.getByRole('button', { name: /^history$/i }))
    expect(screen.getByTestId('guest-reason').textContent).toBe('historial')

    await user.click(screen.getByRole('button', { name: /go-login/i }))
    expect((globalThis.location as { href: string }).href).toBe('/login.html')

    await user.click(screen.getByRole('button', { name: /add-friend/i }))
    await user.click(screen.getByRole('button', { name: /go-register/i }))
    expect((globalThis.location as { href: string }).href).toBe('/register.html')
  })

  test('en multijugador usa estrategia para invitar, aceptar y abandonar al menu', async () => {
    localStorage.setItem('yovi_user', 'alice')
    const user = userEvent.setup()

    const { GameAppContent } = await loadGameMain()
    await renderGameApp(<GameAppContent gameMode="multiplayer" isGuestMode={false} storedUsername="alice" />)

    const strategy = multiplayerInstances.at(-1) as {
      config: Record<string, (...args: unknown[]) => void>
      challengePlayer: ReturnType<typeof vi.fn>
      acceptChallenge: ReturnType<typeof vi.fn>
      surrender: ReturnType<typeof vi.fn>
      initialize: ReturnType<typeof vi.fn>
    }

    expect(strategy.initialize).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /invite-friend/i }))
    expect(multiplayerInstances.some((instance) =>
      (instance.challengePlayer as ReturnType<typeof vi.fn>).mock.calls.some(([arg]) => arg === 'rival-user')
    )).toBe(true)

    await act(async () => {
      strategy.config.onChallenge?.({ challenger: 'rival-user', challengeId: 'challenge-1' })
    })

    await user.click(screen.getByRole('button', { name: /aceptar/i }))
    expect(multiplayerInstances.some((instance) =>
      (instance.acceptChallenge as ReturnType<typeof vi.fn>).mock.calls.some(([arg]) => arg === 'challenge-1')
    )).toBe(true)

    ;(globalThis.confirm as ReturnType<typeof vi.fn>).mockReturnValueOnce(false)
    await user.click(screen.getByRole('button', { name: /mode-menu/i }))
    expect((globalThis.location as unknown as { replace: any }).replace).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /mode-menu/i }))
    expect(multiplayerInstances.some((instance) =>
      (instance.surrender as ReturnType<typeof vi.fn>).mock.calls.length > 0
    )).toBe(true)
    expect(locationReplaceMock).toHaveBeenCalledWith('/gamemode.html')
  })

  test('procesa sync, errores y desconexion multijugador', async () => {
    localStorage.setItem('yovi_user', 'alice')
    const alertMock = vi.fn()
    vi.stubGlobal('alert', alertMock)

    const { GameAppContent } = await loadGameMain()
    await renderGameApp(<GameAppContent gameMode="multiplayer" isGuestMode={false} storedUsername="alice" />)

    const strategy = multiplayerInstances.at(-1) as {
      config: Record<string, (...args: unknown[]) => void>
      setMatchId: ReturnType<typeof vi.fn>
    }

    await act(async () => {
      strategy.config.onSync?.({ error: 'nope' })
    })
    expect(alertMock).toHaveBeenCalledWith('nope')

    await act(async () => {
      strategy.config.onOpponentDataFetched?.({ name: 'Bob', icon: 'hombre2.png' })
      strategy.config.onSync?.({
        matchId: 'match-1',
        players: ['alice', 'bob'],
        board: { size: 3, turn: 0, players: ['B', 'R'], layout: './..' },
        currentTurn: 'alice',
      })
    })
    expect(strategy.setMatchId).toHaveBeenCalledWith('match-1')

    await act(async () => {
      strategy.config.onSync?.({
        matchId: 'match-1',
        players: ['alice', 'bob'],
        winner: 'alice',
      })
    })
    expect(screen.getByTestId('result-modal').textContent).toContain('true')

    await act(async () => {
      strategy.config.onPlayerDisconnected?.()
    })
    expect(alertMock).toHaveBeenCalledWith('El rival ha salido de la partida.')
    expect(locationReplaceMock).toHaveBeenCalledWith('/gamemode.html')
  })
})

