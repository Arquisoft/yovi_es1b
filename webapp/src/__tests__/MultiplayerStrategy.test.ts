import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MultiplayerStrategy } from '../strategies/MultiplayerStrategy';
import type { SyncBoardEvent } from '../types/socketEvents';

const socketState = vi.hoisted(() => {
  const handlers = new Map<string, (payload: unknown) => void>();
  return {
    handlers,
    socket: {
      connected: false,
      on: vi.fn((event: string, handler: (payload: unknown) => void) => {
        handlers.set(event, handler);
      }),
      off: vi.fn(),
      emit: vi.fn(),
      connect: vi.fn(),
    },
  };
});

const getPublicProfileMock = vi.hoisted(() => vi.fn());

vi.mock('../services/socketClient', () => ({
  getSocketClient: () => socketState.socket,
}));

vi.mock('../services/gameService', () => ({
  gameService: {
    getPublicProfile: getPublicProfileMock,
  },
}));

describe('MultiplayerStrategy', () => {
  beforeEach(() => {
    socketState.handlers.clear();
    const socketMock = socketState.socket;
    socketMock.connected = false;
    vi.clearAllMocks();
    getPublicProfileMock.mockResolvedValue({
      username: 'rival',
      nickname: 'Rival Nick',
      iconName: 'rival.png',
    });
  });

  test('registers socket handlers and connects when needed', async () => {
    const strategy = new MultiplayerStrategy({
      username: 'alice',
      boardSize: 6,
      onSync: vi.fn(),
      onChallenge: vi.fn(),
    });

    await strategy.initialize();

    expect(socketState.socket.on).toHaveBeenCalledWith('sync_board', expect.any(Function));
    expect(socketState.socket.on).toHaveBeenCalledWith('challenge_player', expect.any(Function));
    expect(socketState.socket.connect).toHaveBeenCalledOnce();
  });

  test('sync fetches opponent profile and forwards payload', async () => {
    const onSync = vi.fn();
    const onOpponentDataFetched = vi.fn();
    const strategy = new MultiplayerStrategy({
      username: 'alice',
      boardSize: 6,
      onSync,
      onChallenge: vi.fn(),
      onOpponentDataFetched,
    });

    await strategy.initialize();
    socketState.handlers.get('sync_board')?.({ players: ['alice', 'rival'] } satisfies SyncBoardEvent);
    await vi.waitFor(() => expect(onOpponentDataFetched).toHaveBeenCalledWith({ name: 'Rival Nick', icon: 'rival.png' }));

    expect(onSync).toHaveBeenCalledWith({ players: ['alice', 'rival'] });
    expect(strategy.getRivalInfo()).toEqual({ name: 'Rival Nick', icon: 'rival.png' });
  });

  test('emits multiplayer events for challenge, match, move and surrender', async () => {
    const strategy = new MultiplayerStrategy({
      username: 'alice',
      boardSize: 7,
      onSync: vi.fn(),
      onChallenge: vi.fn(),
    });

    strategy.challengePlayer('rival');
    strategy.setMatchId('match-1');
    const moveResult = await strategy.onCellClick(4);
    await strategy.surrender('Easy');

    expect(socketState.socket.emit).toHaveBeenCalledWith('challenge_player', { opponentUsername: 'rival', boardSize: 7 });
    expect(socketState.socket.emit).toHaveBeenCalledWith('join_match', { matchId: 'match-1' });
    expect(socketState.socket.emit).toHaveBeenCalledWith('game_move', { matchId: 'match-1', cellIndex: 4 });
    expect(socketState.socket.emit).toHaveBeenCalledWith('leave_match', { matchId: 'match-1' });
    expect(moveResult).toEqual({ board: null, winner: null });
  });

  test('returns null when moving without an active match', async () => {
    const strategy = new MultiplayerStrategy({
      username: 'alice',
      boardSize: 6,
      onSync: vi.fn(),
      onChallenge: vi.fn(),
    });

    await expect(strategy.onCellClick(1)).resolves.toBeNull();
  });

  test('accepts challenges and forwards connection and disconnect events', async () => {
    const onSync = vi.fn();
    const onPlayerDisconnected = vi.fn();
    const strategy = new MultiplayerStrategy({
      username: 'alice',
      boardSize: 6,
      onSync,
      onChallenge: vi.fn(),
      onPlayerDisconnected,
    });

    await strategy.initialize();
    strategy.acceptChallenge('challenge-1');
    socketState.handlers.get('connect_error')?.(new Error('socket down'));
    socketState.handlers.get('player_disconnected')?.({ username: 'rival' });

    expect(socketState.socket.emit).toHaveBeenCalledWith('accept_challenge', { challengeId: 'challenge-1' });
    expect(onSync).toHaveBeenCalledWith({ error: 'socket down' });
    expect(onPlayerDisconnected).toHaveBeenCalledWith('rival');
  });
});
