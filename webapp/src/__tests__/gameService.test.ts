import { describe, test, expect, vi, beforeEach } from 'vitest'
import { gameService } from '../services/gameService'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const mockJsonResponse = (data: unknown, ok = true) =>
    Promise.resolve({
        ok,
        json: () => Promise.resolve(data),
        text: () => Promise.resolve(JSON.stringify(data)),
    } as Response)

describe('gameService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // ── getDifficulties ────────────────────────

    test('getDifficulties devuelve un array de dificultades', async () => {
        mockFetch.mockReturnValue(mockJsonResponse(['Easy', 'Medium', 'Hard']))

        const result = await gameService.getDifficulties()

        expect(result).toEqual(['Easy', 'Medium', 'Hard'])
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/difficulties'))
    })

    // ── makeMove ───────────────────────────────

    test('makeMove envía el movimiento correctamente', async () => {
        mockFetch.mockReturnValue(mockJsonResponse({ winner: null }))

        await gameService.makeMove(5, 'alice', 'Easy', 6)

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/move'),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ cellIndex: 5, username: 'alice', difficulty: 'Easy', boardSize: 6 }),
            })
        )
    })

    // ── resetBoard ─────────────────────────────

    test('resetBoard devuelve responseFromRust si existe', async () => {
        const board = { size: 6, turn: 0, players: ['B', 'R'], layout: '.' }
        mockFetch.mockReturnValue(mockJsonResponse({ responseFromRust: board }))

        const result = await gameService.resetBoard(6, 'Easy', 'alice')

        expect(result).toEqual(board)
    })

    test('resetBoard devuelve data directamente si no hay responseFromRust', async () => {
        const board = { size: 6, turn: 0, players: ['B', 'R'], layout: '.' }
        mockFetch.mockReturnValue(mockJsonResponse(board))

        const result = await gameService.resetBoard(6, 'Easy', 'alice')

        expect(result).toEqual(board)
    })

    // ── surrender ──────────────────────────────

    test('surrender envía los datos correctamente', async () => {
        mockFetch.mockReturnValue(mockJsonResponse({}))

        await gameService.surrender('alice', 'Easy', 6)

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/surrender'),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ username: 'alice', difficulty: 'Easy', boardSize: 6 }),
            })
        )
    })

    // ── getHistory ─────────────────────────────

    test('getHistory construye la URL correctamente sin filtro', async () => {
        mockFetch.mockReturnValue(mockJsonResponse({ data: [], total_pages: 1, page: 1 }))

        await gameService.getHistory('alice', 1)

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('username=alice&page=1&limit=5')
        )
    })

    test('getHistory añade el filtro a la URL si se pasa', async () => {
        mockFetch.mockReturnValue(mockJsonResponse({ data: [], total_pages: 1, page: 1 }))

        await gameService.getHistory('alice', 1, 'win')

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('result=win')
        )
    })

    // ── getFriends ─────────────────────────────

    test('getFriends devuelve lista de amigos', async () => {
        const friends = [{ name: 'bob', status: 'online' }]
        mockFetch.mockReturnValue(mockJsonResponse(friends))

        const result = await gameService.getFriends('alice')

        expect(result).toEqual(friends)
    })

    test('getFriends devuelve array vacío si la respuesta no es ok', async () => {
        mockFetch.mockReturnValue(mockJsonResponse({}, false))

        const result = await gameService.getFriends('alice')

        expect(result).toEqual([])
    })

    test('getFriends devuelve array vacío si hay error de red', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'))

        const result = await gameService.getFriends('alice')

        expect(result).toEqual([])
    })

    // ── getProfile ─────────────────────────────

    test('getProfile llama al endpoint correcto', async () => {
        mockFetch.mockReturnValue(mockJsonResponse({ username: 'alice' }))

        await gameService.getProfile('alice')

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/users/profile/alice')
        )
    })

    // ── updateProfile ──────────────────────────

    test('updateProfile envía PATCH con el payload correcto', async () => {
        mockFetch.mockReturnValue(mockJsonResponse({ ok: true }))

        await gameService.updateProfile('alice', { nickname: 'Ali', language: 'es' })

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/users/profile/alice'),
            expect.objectContaining({
                method: 'PATCH',
                body: JSON.stringify({ nickname: 'Ali', language: 'es' }),
            })
        )
    })

    // ── changePassword ─────────────────────────

    test('changePassword envía las contraseñas correctamente', async () => {
        mockFetch.mockReturnValue(mockJsonResponse({ ok: true }))

        await gameService.changePassword('alice', 'oldpass', 'newpass')

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/change-password'),
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
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('%23ABC123')
        )
    })

    test('searchUserByCode devuelve null si no hay resultados', async () => {
        mockFetch.mockReturnValue(mockJsonResponse([]))

        const result = await gameService.searchUserByCode('XYZ')

        expect(result).toBeNull()
    })

    test('searchUserByCode lanza error si la respuesta no es ok', async () => {
        mockFetch.mockReturnValue(mockJsonResponse({}, false))

        await expect(gameService.searchUserByCode('ABC')).rejects.toThrow('Error en la búsqueda')
    })

    // ── followUser ─────────────────────────────

    test('followUser envía follower y following correctamente', async () => {
        mockFetch.mockReturnValue(mockJsonResponse({ ok: true }))

        await gameService.followUser('alice', 'bob')

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/users/follow'),
            expect.objectContaining({
                body: JSON.stringify({ follower: 'alice', following: 'bob' }),
            })
        )
    })

    test('followUser lanza error si la respuesta no es ok', async () => {
        mockFetch.mockReturnValue(mockJsonResponse({ error: 'Ya son amigos' }, false))

        await expect(gameService.followUser('alice', 'bob')).rejects.toThrow('Ya son amigos')
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

    test('respondToFriendRequest lanza error si la respuesta no es ok', async () => {
        mockFetch.mockReturnValue(mockJsonResponse({ error: 'Solicitud no encontrada' }, false))

        await expect(gameService.respondToFriendRequest('req123', 'accepted'))
            .rejects.toThrow('Solicitud no encontrada')
    })

    // ── getPendingRequests ─────────────────────

    test('getPendingRequests devuelve las solicitudes pendientes', async () => {
        const requests = [{ id: '1', from: 'bob' }]
        mockFetch.mockReturnValue(mockJsonResponse(requests))

        const result = await gameService.getPendingRequests('alice')

        expect(result).toEqual(requests)
    })

    test('getPendingRequests lanza error si la respuesta no es ok', async () => {
        mockFetch.mockReturnValue(mockJsonResponse({}, false))

        await expect(gameService.getPendingRequests('alice'))
            .rejects.toThrow('No se pudieron obtener las solicitudes')
    })
})