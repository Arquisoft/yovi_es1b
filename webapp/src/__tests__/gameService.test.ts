import { describe, test, expect, vi, beforeEach } from 'vitest';
import { gameService } from '../services/gameService';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const makeStorage = (initial: Record<string, string> = {}) => {
  let store: Record<string, string> = { ...initial };
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

const mockJsonResponse = (data: unknown, ok = true) =>
  Promise.resolve({
    ok,
    status: ok ? 200 : 500, // Añadimos status por coherencia
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    // SOLUCIÓN: Añadimos el objeto headers con el método get
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === 'content-type') return 'application/json';
        return null;
      },
    },
  } as unknown as Response);
const expectGetCall = (urlFragment: string) => {
  expect(String(mockFetch.mock.calls.at(-1)?.[0])).toContain(urlFragment);
};

const expectGetCallWithOptions = (urlFragment: string) => {
  expect(mockFetch).toHaveBeenCalledWith(
    expect.stringContaining(urlFragment),
    expect.anything()
  );
};

const expectPostCall = (urlFragment: string, bodyFragment: string) => {
  expect(mockFetch).toHaveBeenCalledWith(
    expect.stringContaining(urlFragment),
    expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining(bodyFragment),
    })
  );
};

describe('gameService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('sessionStorage', makeStorage({ username: 'alice', token: 'test-token' }));
    vi.stubGlobal('localStorage', makeStorage({ yovi_user: 'alice' }));
  });

  test('getDifficulties devuelve un array de dificultades', async () => {
    mockFetch.mockReturnValue(mockJsonResponse(['Easy', 'Medium', 'Hard']));

    const result = await gameService.getDifficulties();

    expect(result).toEqual(['Easy', 'Medium', 'Hard']);
    expectGetCall('/difficulties');
  });

  test.each([
    {
      name: 'makeMove envía el movimiento correctamente sin pasar username manual',
      action: () => gameService.makeMove(5, 'Easy', 6),
      response: { winner: null },
      assert: () => expectPostCall('/move', '"username":"alice"'),
    },
    {
      name: 'resetBoard devuelve responseFromRust y usa sesión interna',
      action: () => gameService.resetBoard(6, 'Easy'),
      response: { responseFromRust: { size: 6, turn: 0, players: ['B', 'R'], layout: '.' } },
      assert: (result: unknown) => {
        expect(result).toEqual({ size: 6, turn: 0, players: ['B', 'R'], layout: '.' });
        expectPostCall('/reset', '"username":"alice"');
      },
    },
    {
      name: 'surrender envía los datos correctamente usando sesión',
      action: () => gameService.surrender('Easy', 6),
      response: {},
      assert: () => expectPostCall('/surrender', '"username":"alice"'),
    },
    {
      name: 'updateProfile envía PATCH usando sesión',
      action: () => gameService.updateProfile({ nickname: 'Ali', language: 'es' }),
      response: { ok: true },
      assert: () => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/users/profile/alice'),
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ nickname: 'Ali', language: 'es' }),
          })
        );
      },
    },
    {
      name: 'changePassword envía las contraseñas correctamente usando sesión',
      action: () => gameService.changePassword('oldpass', 'newpass'),
      response: { ok: true },
      assert: () => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/users/profile/alice/change-password'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ currentPassword: 'oldpass', newPassword: 'newpass' }),
          })
        );
      },
    },
    {
      name: 'followUser envía follower (sesión) y following correctamente',
      action: () => gameService.followUser('bob'),
      response: { ok: true },
      assert: () => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/users/follow'),
          expect.objectContaining({
            body: JSON.stringify({ follower: 'alice', following: 'bob' }),
          })
        );
      },
    },
    {
      name: 'respondToFriendRequest envía requestId y action',
      action: () => gameService.respondToFriendRequest('req123', 'accepted'),
      response: { ok: true },
      assert: () => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/friends/respond'),
          expect.objectContaining({
            body: JSON.stringify({ requestId: 'req123', action: 'accepted' }),
          })
        );
      },
    },
  ])('$name', async ({ action, response, assert }) => {
    mockFetch.mockReturnValue(mockJsonResponse(response));

    const result = await action();

    assert(result);
  });

  test.each([
    {
      name: 'getHistory construye la URL correctamente usando sesión',
      action: () => gameService.getHistory(1),
      response: { data: [], total_pages: 1, page: 1 },
      assert: () => expectGetCall('username=alice&page=1&limit=5'),
    },
    {
      name: 'getHistory añade el filtro a la URL si se pasa',
      action: () => gameService.getHistory(1, 'win'),
      response: { data: [], total_pages: 1, page: 1 },
      assert: () => expectGetCall('result=win'),
    },
    {
      name: 'getFriends devuelve lista de amigos usando sesión',
      action: () => gameService.getFriends(),
      response: [{ name: 'bob', status: 'online' }],
      assert: (result: unknown) => {
        expect(result).toEqual([{ name: 'bob', status: 'online' }]);
        expectGetCallWithOptions('username=alice');
      },
    },
    {
      name: 'getProfile llama al endpoint correcto usando sesión',
      action: () => gameService.getProfile(),
      response: { username: 'alice' },
      assert: () => expectGetCallWithOptions('/users/profile/alice'),
    },
    {
      name: 'searchUserByCode devuelve el primer usuario encontrado',
      action: () => gameService.searchUserByCode('ABC123'),
      response: [{ username: 'bob', friendCode: 'ABC123' }],
      assert: (result: unknown) => {
        expect(result).toEqual({ username: 'bob', friendCode: 'ABC123' });
      },
    },
  ])('$name', async ({ action, response, assert }) => {
    mockFetch.mockReturnValue(mockJsonResponse(response));

    const result = await action();

    assert(result);
  });
});
