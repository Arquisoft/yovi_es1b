import { describe, test, expect, vi, beforeEach } from 'vitest'
import { gameService } from '../services/gameService'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock de localStorage para simular la sesión activa
const localStorageMock = (() => {
    let store: Record<string, string> = {
        'yovi_user': 'alice' // Usuario por defecto para los tests
    };
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value },
        clear: () => { store = {} }
    };
})();
vi.stubGlobal('localStorage', localStorageMock);

const mockJsonResponse = (data: unknown, ok = true) =>
    Promise.resolve({
        ok,
        json: () => Promise.resolve(data),
        text: () => Promise.resolve(JSON.stringify(data)),
    } as Response)

describe('gameService', () => {
    // Al principio del archivo, después de los imports
    beforeEach(() => {
        vi.clearAllMocks();
        // Forzamos que cada vez que el código pida el usuario, devuelva 'alice'
        vi.stubGlobal('sessionStorage', {
            getItem: vi.fn().mockReturnValue('alice'),
            setItem: vi.fn(),
            clear: vi.fn(),
        });
        vi.stubGlobal('localStorage', {
            getItem: vi.fn().mockReturnValue('alice'),
            setItem: vi.fn(),
            clear: vi.fn(),
        });
    });

    // ── getDifficulties ────────────────────────

    test('getDifficulties devuelve un array de dificultades', async () => {
        mockFetch.mockReturnValue(mockJsonResponse(['Easy', 'Medium', 'Hard']))

        const result = await gameService.getDifficulties()

        expect(result).toEqual(['Easy', 'Medium', 'Hard'])
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/difficulties'))
    })

    // ── makeMove ───────────────────────────────

    test('makeMove envía el movimiento correctamente sin pasar username manual', async () => {
        mockFetch.mockReturnValue(mockJsonResponse({ winner: null }))

        await gameService.makeMove(5, 'Easy', 6)

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/move'),
            expect.objectContaining({
                method: 'POST',
                // El servicio debe haber incluido "alice" automáticamente en el body
                body: expect.stringContaining('"username":"alice"'),
            })
        )
    })

    // ── resetBoard ─────────────────────────────

    test('resetBoard devuelve responseFromRust y usa sesión interna', async () => {
        const board = { size: 6, turn: 0, players: ['B', 'R'], layout: '.' }
        mockFetch.mockReturnValue(mockJsonResponse({ responseFromRust: board }))

        const result = await gameService.resetBoard(6, 'Easy')

        expect(result).toEqual(board)
        expect(mockFetch).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                body: expect.stringContaining('"username":"alice"')
            })
        )
    })

    // ── surrender ──────────────────────────────

    test('surrender envía los datos correctamente usando sesión', async () => {
        mockFetch.mockReturnValue(mockJsonResponse({}))

        await gameService.surrender('Easy', 6)

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/surrender'),
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('"username":"alice"'),
            })
        )
    })

    // ── getHistory ─────────────────────────────

    test('getHistory construye la URL correctamente usando sesión', async () => {
        mockFetch.mockReturnValue(mockJsonResponse({ data: [], total_pages: 1, page: 1 }))

        await gameService.getHistory(1)

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('username=alice&page=1&limit=5')
        )
    })

    test('getHistory añade el filtro a la URL si se pasa', async () => {
        mockFetch.mockReturnValue(mockJsonResponse({ data: [], total_pages: 1, page: 1 }))

        await gameService.getHistory(1, 'win')

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('result=win')
        )
    })

    // ── getFriends ─────────────────────────────

    test('getFriends devuelve lista de amigos usando sesión', async () => {
        const friends = [{ name: 'bob', status: 'online' }]
        mockFetch.mockReturnValue(mockJsonResponse(friends))

        const result = await gameService.getFriends()

        expect(result).toEqual(friends)
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('username=alice'),
            expect.anything()
        )
    })

    // ── getProfile ─────────────────────────────

    test('getProfile llama al endpoint correcto usando sesión', async () => {
        mockFetch.mockReturnValue(mockJsonResponse({ username: 'alice' }))

        await gameService.getProfile()

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/users/profile/alice'),
            expect.objectContaining({
                method: 'GET',
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                }),
            })
        )
    })

    // ── updateProfile ──────────────────────────

    test('updateProfile envía PATCH usando sesión', async () => {
        mockFetch.mockReturnValue(mockJsonResponse({ ok: true }))

        await gameService.updateProfile({ nickname: 'Ali', language: 'es' })

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/users/profile/alice'),
            expect.objectContaining({
                method: 'PATCH',
                body: JSON.stringify({ nickname: 'Ali', language: 'es' }),
            })
        )
    })

    // ── changePassword ─────────────────────────

    test('changePassword envía las contraseñas correctamente usando sesión', async () => {
        mockFetch.mockReturnValue(mockJsonResponse({ ok: true }))

        await gameService.changePassword('oldpass', 'newpass')

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/users/profile/alice/change-password'),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ currentPassword: 'oldpass', newPassword: 'newpass' }),
            })
        )
    })

    // ── searchUserByCode ───────────────────────

    test('searchUserByCode devuelve el primer usuario encontrado', async () => {
        const user = { username: 'bob', friendCode: 'ABC123' }
        mockFetch.mockReturnValue(mockJsonResponse([user]))

        const result = await gameService.searchUserByCode('ABC123')

        expect(result).toEqual(user)
    })

    // ── followUser ─────────────────────────────

    test('followUser envía follower (sesión) y following correctamente', async () => {
        mockFetch.mockReturnValue(mockJsonResponse({ ok: true }))

        await gameService.followUser('bob')

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/users/follow'),
            expect.objectContaining({
                body: JSON.stringify({ follower: 'alice', following: 'bob' }),
            })
        )
    })

    // ── respondToFriendRequest ─────────────────

    test('respondToFriendRequest envía requestId y action', async () => {
        mockFetch.mockReturnValue(mockJsonResponse({ ok: true }))

        await gameService.respondToFriendRequest('req123', 'accepted')

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/friends/respond'),
            expect.objectContaining({
                body: JSON.stringify({ requestId: 'req123', action: 'accepted' }),
            })
        )
    })

    // ── getPendingRequests ─────────────────────

    test('getPendingRequests devuelve las solicitudes pendientes usando sesión', async () => {
        const requests = [{ id: '1', from: 'bob' }]
        mockFetch.mockReturnValue(mockJsonResponse(requests))

        const result = await gameService.getPendingRequests()

        expect(result).toEqual(requests)
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('username=alice')
        )
    })
})