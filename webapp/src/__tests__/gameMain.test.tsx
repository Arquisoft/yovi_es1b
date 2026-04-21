import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { ReactNode } from 'react'

const gameServiceMocks = {
  getDifficulties: vi.fn(),
  getProfile: vi.fn(),
  getHistory: vi.fn(),
}

const gameLogicMocks = {
  boardData: { size: 5, turn: 0, players: ['B', 'R'], layout: '.....' },
  winner: null as number | null,
  executeHumanMove: vi.fn(),
  executeAutoMove: vi.fn(),
  resetGame: vi.fn(),
  surrender: vi.fn(),
}

let triggerTimeUp: (() => void) | null = null

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
    </div>
  ),
}))

vi.mock('../components/layout/MenuBackgroundChrome', () => ({
  MenuBackgroundChrome: ({ children, showSettings }: { children?: ReactNode; showSettings: boolean }) => (
    <div data-testid="menu-chrome" data-settings={String(showSettings)}>
      {children}
    </div>
  ),
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
  HistoryModal: ({ isOpen }: { isOpen: boolean }) => <div data-testid="history-modal">{String(isOpen)}</div>,
}))

vi.mock('../components/modals/ResultModal', () => ({
  ResultModal: ({ isOpen }: { isOpen: boolean }) => <div data-testid="result-modal">{String(isOpen)}</div>,
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
  FriendsPanel: ({ onTriggerPublicProfile }: { onTriggerPublicProfile: (value: string) => void }) => (
    <button type="button" onClick={() => onTriggerPublicProfile('friend-user')}>trigger-public-profile</button>
  ),
}))

vi.mock('../hooks/useMenuBackgroundMedia', () => ({
  useMenuBackgroundMedia: () => ({
    audioRef: { current: null },
    isVideoPaused: false,
    musicVolume: 0.4,
    setIsVideoPaused: vi.fn(),
    setMusicVolume: vi.fn(),
    setShowSettings: vi.fn(),
    showSettings: false,
    videoRef: { current: null },
  }),
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

const loadGameMain = async () => import('../pages/game/main')

describe('game main entrypoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    window.history.pushState({}, '', '/game.html')
    vi.stubGlobal('location', {
      href: 'http://localhost/game.html',
      origin: 'http://localhost',
      pathname: '/game.html',
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
    gameLogicMocks.executeHumanMove.mockResolvedValue({ responseFromRust: null, winner: null })
    gameLogicMocks.executeAutoMove.mockResolvedValue({ responseFromRust: null, winner: null })
    gameLogicMocks.resetGame.mockResolvedValue(null)
    gameLogicMocks.surrender.mockResolvedValue(undefined)
    triggerTimeUp = null
  })

  test('redirige al index cuando no hay usuario y no es invitado', async () => {
    localStorage.removeItem('yovi_user')
    sessionStorage.removeItem('yovi_guest')

    const { GameApp } = await loadGameMain()
    render(<GameApp />)

    await waitFor(() => {
      expect((globalThis.location as { href: string }).href).toBe('/index.html')
    })
  })

  test('renderiza la partida y conecta callbacks principales', async () => {
    localStorage.setItem('yovi_user', 'alice')
    localStorage.setItem('yovi_user_icon', 'hombre1.png')

    const { GameAppContent } = await loadGameMain()
    render(<GameAppContent isGuestMode={false} storedUsername="alice" />)

    await waitFor(() => {
      expect(gameServiceMocks.getDifficulties).toHaveBeenCalled()
      expect(gameServiceMocks.getProfile).toHaveBeenCalled()
    })

    expect(localStorage.getItem('yovi_user_icon')).toBeTruthy()
    triggerTimeUp?.()
    expect(gameLogicMocks.executeAutoMove).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /select-difficulty/i }))
    fireEvent.click(screen.getByRole('button', { name: /select-size/i }))
    fireEvent.click(screen.getByRole('button', { name: /reset/i }))
    fireEvent.click(screen.getByRole('button', { name: /^end$/i }))
    fireEvent.click(screen.getByRole('button', { name: /add-friend/i }))
    fireEvent.click(screen.getByRole('button', { name: /trigger-public-profile/i }))
    fireEvent.click(screen.getByRole('button', { name: /view-profile/i }))
    fireEvent.click(screen.getByRole('button', { name: /settings/i }))
    fireEvent.click(screen.getByRole('button', { name: /tutorial/i }))
    fireEvent.click(screen.getByRole('button', { name: /history/i }))
    fireEvent.click(screen.getByRole('button', { name: /cell/i }))
    fireEvent.click(screen.getByRole('button', { name: /exit/i }))

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

    gameLogicMocks.executeHumanMove.mockResolvedValueOnce({
      responseFromRust: null,
      winner: 0,
      score: 42,
    })

    const { GameAppContent } = await loadGameMain()
    render(<GameAppContent isGuestMode={false} storedUsername="alice" />)

    fireEvent.click(screen.getByRole('button', { name: /cell/i }))

    await waitFor(() => {
      expect(gameLogicMocks.executeHumanMove).toHaveBeenCalled()
      expect(screen.getByTestId('result-modal').textContent).toBe('true')
    })
  })

  test('al pedir historial carga datos y abre el modal', async () => {
    localStorage.setItem('yovi_user', 'alice')

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
    render(<GameAppContent isGuestMode={false} storedUsername="alice" />)

    fireEvent.click(screen.getByRole('button', { name: /history/i }))

    await waitFor(() => {
      expect(gameServiceMocks.getHistory).toHaveBeenCalledWith(1, null)
      expect(screen.getByTestId('history-modal').textContent).toBe('true')
    })
  })

  test('en modo invitado muestra el prompt de acceso', async () => {
    localStorage.setItem('yovi_user', 'alice')

    const { GameAppContent } = await loadGameMain()
    render(<GameAppContent isGuestMode={true} storedUsername="alice" />)

    fireEvent.click(screen.getByRole('button', { name: /add-friend/i }))
    expect(screen.getByTestId('guest-reason').textContent).toBe('amigos')

    fireEvent.click(screen.getByRole('button', { name: /view-profile/i }))
    expect(screen.getByTestId('guest-reason').textContent).toBe('perfil')

    fireEvent.click(screen.getByRole('button', { name: /history/i }))
    expect(screen.getByTestId('guest-reason').textContent).toBe('historial')

    fireEvent.click(screen.getByRole('button', { name: /go-login/i }))
    expect((globalThis.location as { href: string }).href).toBe('/login.html')
  })
})
