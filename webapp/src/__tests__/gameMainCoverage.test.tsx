import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import i18n from '../i18n';
import { resolveBoardLabel, resolveHistoryLocale, resolveTurnTimeLimit } from '../pages/game/gameMainHelpers';

const coverageState = vi.hoisted(() => ({
  gameServiceMocks: {
    getDifficulties: vi.fn(),
    getProfile: vi.fn(),
    getHistory: vi.fn(),
  },
  gameLogicMocks: {
    boardData: { size: 5, turn: 0, players: ['B', 'R'], layout: '.....' },
    winner: null as number | null,
    executeHumanMove: vi.fn(),
    executeAutoMove: vi.fn(),
    resetGame: vi.fn(),
    surrender: vi.fn(),
  },
  triggerTimeUp: null as null | (() => void),
}));

vi.mock('react-dom/client', () => ({
  default: {
    createRoot: vi.fn(() => ({ render: vi.fn() })),
  },
  createRoot: vi.fn(() => ({ render: vi.fn() })),
}));

vi.mock('../screens/GameScreen', () => ({
  default: (props: Record<string, unknown>) => (
    <div>
      <div data-testid="game-started">{String(props.gameStarted)}</div>
      <div data-testid="total-score">{String(props.totalScore)}</div>
      <button type="button" onClick={() => (props.onCellClick as (index: number) => void)(3)}>cell</button>
      <button type="button" onClick={() => (props.onFetchHistory as () => void)()}>history</button>
    </div>
  ),
}));

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
      <div>
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
}));

vi.mock('../components/modals/SelectionModals', () => ({
  SelectionModals: () => <div data-testid="selection-modals" />,
}));

vi.mock('../components/modals/HistoryModal', () => ({
  HistoryModal: ({ isOpen }: { isOpen: boolean }) => <div data-testid="history-modal">{String(isOpen)}</div>,
}));

vi.mock('../components/modals/ResultModal', () => ({
  ResultModal: ({ isOpen }: { isOpen: boolean }) => <div data-testid="result-modal">{String(isOpen)}</div>,
}));

vi.mock('../components/modals/PublicProfileModal', () => ({
  PublicProfileModal: () => <div data-testid="public-profile" />,
}));

vi.mock('../components/modals/GuestAccessModal', () => ({
  GuestAccessModal: () => <div data-testid="guest-modal" />,
}));

vi.mock('../screens/ProfileScreen', () => ({
  ProfileScreen: ({ isOpen }: { isOpen: boolean }) => <div data-testid="profile-screen">{String(isOpen)}</div>,
}));

vi.mock('../screens/TutorialScreen', () => ({
  TutorialScreen: ({ isOpen }: { isOpen: boolean }) => <div data-testid="tutorial-screen">{String(isOpen)}</div>,
}));

vi.mock('../components/modals/FriendsPanel', () => ({
  FriendsPanel: () => <div data-testid="friends-panel" />,
}));

vi.mock('../hooks/useGameLogic', () => ({
  useGameLogic: () => coverageState.gameLogicMocks,
}));

vi.mock('../hooks/useGameTimer', () => ({
  useGameTimer: (_handleTimeUp: () => void) => {
    coverageState.triggerTimeUp = _handleTimeUp;
    return {
      timeLeft: 12,
      isVisible: true,
      startTimer: vi.fn(),
      stopTimer: vi.fn(),
      setIsVisible: vi.fn(),
    };
  },
}));

vi.mock('../services/gameService', () => ({
  gameService: coverageState.gameServiceMocks,
}));

const loadGameMain = async () => import('../pages/game/main');

const renderGameApp = async (ui: Parameters<typeof render>[0]) => {
  let result: ReturnType<typeof render> | undefined;
  await act(async () => {
    result = render(ui);
    await Promise.resolve();
    await Promise.resolve();
  });
  return result!;
};

describe('game main coverage', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn> | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    void i18n.changeLanguage('es');
    window.history.pushState({}, '', '/game.html');
    vi.stubGlobal('location', {
      href: 'http://localhost/game.html',
      origin: 'http://localhost',
      pathname: '/game.html',
    });
    vi.spyOn(window.crypto, 'getRandomValues').mockImplementation((array) => {
      (array as Uint32Array)[0] = 0;
      return array;
    });
    vi.spyOn(window.HTMLVideoElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(window.HTMLVideoElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(window.HTMLAudioElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(window.HTMLAudioElement.prototype, 'pause').mockImplementation(() => {});
    coverageState.gameServiceMocks.getDifficulties.mockResolvedValue(['Easy', 'Hard']);
    coverageState.gameServiceMocks.getProfile.mockResolvedValue({ iconName: 'hombre1.png', language: 'Portuguese', totalScore: 10 });
    coverageState.gameServiceMocks.getHistory.mockResolvedValue({ data: [], total_pages: 1, page: 1 });
    coverageState.gameLogicMocks.executeHumanMove.mockResolvedValue({ responseFromRust: null, winner: null });
    coverageState.gameLogicMocks.executeAutoMove.mockResolvedValue({ responseFromRust: null, winner: null });
    coverageState.gameLogicMocks.resetGame.mockResolvedValue(null);
    coverageState.gameLogicMocks.surrender.mockResolvedValue(undefined);
    coverageState.gameLogicMocks.winner = null;
    coverageState.triggerTimeUp = null;
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
    consoleErrorSpy = null;
  });

  test('pasa locale y boardLabel al mover ficha y actualiza la puntuacion al ganar', async () => {
    localStorage.setItem('yovi_user', 'alice');
    void i18n.changeLanguage('pt-BR');
    const user = userEvent.setup();

    coverageState.gameLogicMocks.executeHumanMove.mockResolvedValueOnce({
      responseFromRust: null,
      winner: 0,
      score: 42,
    });

    const { GameAppContent } = await loadGameMain();
    await renderGameApp(<GameAppContent isGuestMode={false} storedUsername="alice" />);

    await waitFor(() => {
      expect(coverageState.gameServiceMocks.getProfile).toHaveBeenCalled();
    });

    await user.click(screen.getByRole('button', { name: /cell/i }));

    await waitFor(() => {
      expect(coverageState.gameLogicMocks.executeHumanMove).toHaveBeenCalledWith(
        3,
        expect.any(String),
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({
          boardLabel: expect.any(String),
          locale: 'pt',
        })
      );
      expect(screen.getByTestId('result-modal').textContent).toBe('true');
    });

    await waitFor(() => {
      expect(screen.getByTestId('total-score').textContent).toBe('52');
    });
  });

  test('resuelve helpers de locale, board label y tiempo con sus fallback', () => {
    expect(resolveHistoryLocale('pt-BR', null)).toBe('pt');
    expect(resolveHistoryLocale(null, null)).toBe('es');
    expect(resolveBoardLabel(null, vi.fn())).toBeNull();
    expect(resolveBoardLabel('Pequeño', (key) => key)).toBe('game.size_small');
    expect(resolveTurnTimeLimit(null)).toBeNull();
    expect(resolveTurnTimeLimit('Fácil')).not.toBeNull();
  });

  test('si el perfil devuelve error no rompe la carga', async () => {
    localStorage.setItem('yovi_user', 'alice');
    coverageState.gameServiceMocks.getProfile.mockResolvedValueOnce({ error: 'nope' });

    const { GameAppContent } = await loadGameMain();
    await renderGameApp(<GameAppContent isGuestMode={false} storedUsername="alice" />);

    await waitFor(() => {
      expect(coverageState.gameServiceMocks.getProfile).toHaveBeenCalled();
      expect(screen.getByTestId('game-started').textContent).toBe('false');
    });
  });

  test('si el perfil no trae icono ni idioma usa el score anidado', async () => {
    localStorage.setItem('yovi_user', 'alice');
    coverageState.gameServiceMocks.getProfile.mockResolvedValueOnce({
      stats: { totalScore: 77 },
    });

    const { GameAppContent } = await loadGameMain();
    await renderGameApp(<GameAppContent isGuestMode={false} storedUsername="alice" />);

    await waitFor(() => {
      expect(coverageState.gameServiceMocks.getProfile).toHaveBeenCalled();
      expect(screen.getByTestId('total-score').textContent).toBe('77');
    });
  });

  test('si ya hay ganador no vuelve a mover ficha', async () => {
    localStorage.setItem('yovi_user', 'alice');
    coverageState.gameLogicMocks.winner = 1;
    const user = userEvent.setup();

    const { GameAppContent } = await loadGameMain();
    await renderGameApp(<GameAppContent isGuestMode={false} storedUsername="alice" />);

    await user.click(screen.getByRole('button', { name: /cell/i }));

    expect(coverageState.gameLogicMocks.executeHumanMove).not.toHaveBeenCalled();
  });

  test('una segunda pulsacion ya con partida empezada sigue permitiendo mover', async () => {
    localStorage.setItem('yovi_user', 'alice');
    const user = userEvent.setup();

    const { GameAppContent } = await loadGameMain();
    await renderGameApp(<GameAppContent isGuestMode={false} storedUsername="alice" />);

    await user.click(screen.getByRole('button', { name: /cell/i }));
    await waitFor(() => {
      expect(coverageState.gameLogicMocks.executeHumanMove).toHaveBeenCalledTimes(1);
    });

    await user.click(screen.getByRole('button', { name: /cell/i }));
    await waitFor(() => {
      expect(coverageState.gameLogicMocks.executeHumanMove).toHaveBeenCalledTimes(2);
    });
  });

  test('al agotarse el tiempo y ganar el bot abre resultado', async () => {
    localStorage.setItem('yovi_user', 'alice');
    coverageState.gameLogicMocks.executeAutoMove.mockResolvedValueOnce({
      responseFromRust: null,
      winner: 1,
    });

    const { GameAppContent } = await loadGameMain();
    await renderGameApp(<GameAppContent isGuestMode={false} storedUsername="alice" />);

    await act(async () => {
      coverageState.triggerTimeUp?.();
    });

    await waitFor(() => {
      expect(coverageState.gameLogicMocks.executeAutoMove).toHaveBeenCalled();
      expect(screen.getByTestId('result-modal').textContent).toBe('true');
    });
  });

  test('si el historial no trae paginacion usa los valores por defecto', async () => {
    localStorage.setItem('yovi_user', 'alice');
    coverageState.gameServiceMocks.getHistory.mockResolvedValueOnce({});
    const user = userEvent.setup();

    const { GameAppContent } = await loadGameMain();
    await renderGameApp(<GameAppContent isGuestMode={false} storedUsername="alice" />);

    await user.click(screen.getByRole('button', { name: /history/i }));

    await waitFor(() => {
      expect(coverageState.gameServiceMocks.getHistory).toHaveBeenCalledWith(1, null);
      expect(screen.getByTestId('history-modal').textContent).toBe('true');
    });
  });
});

