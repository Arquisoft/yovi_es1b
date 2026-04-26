import http from 'node:http'
import jwt from 'jsonwebtoken'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_super_segura_2026'

const loadSocketHandler = async () => import('../socketHandler.js')

const createSocket = (username, id) => {
  const handlers = {}
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' })

  return {
    id,
    data: {},
    handshake: {
      auth: {},
      headers: {
        cookie: `token=${encodeURIComponent(token)}`,
      },
    },
    on: vi.fn((event, handler) => {
      handlers[event] = handler
    }),
    emit: vi.fn(),
    join: vi.fn(),
    disconnect: vi.fn(),
    handlers,
  }
}

const connectAuthenticated = (harness, socket) => {
  harness.middleware(socket, vi.fn())
  harness.connect(socket)
  harness.io.sockets.sockets.set(socket.id, socket)
}

const createActiveMatch = async (harness, fetchMock) => {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: vi.fn().mockResolvedValue({
      board: { size: 6, layout: '.', players: ['alice', 'bob'], turn: 0 },
      next_turn: 'alice',
    }),
  })

  const alice = createSocket('alice', 'socket-alice')
  const bob = createSocket('bob', 'socket-bob')
  connectAuthenticated(harness, alice)
  connectAuthenticated(harness, bob)

  await alice.handlers.challenge_player({ opponentUsername: 'bob', boardSize: 6 })
  const challenge = alice.emit.mock.calls.find(([event]) => event === 'challenge_player')?.[1]
  await bob.handlers.accept_challenge({ challengeId: challenge.challengeId })
  const syncEvent = harness.roomEvents.find(({ event }) => event === 'sync_board')

  return { alice, bob, matchId: syncEvent.payload.matchId, roomId: syncEvent.target }
}

const createGatewayHarness = async () => {
  const roomEvents = []
  const directEvents = []
  const { createSocketGateway } = await loadSocketHandler()
  const io = createSocketGateway(http.createServer(), { gameyUrl: 'https://gamey.test' })

  vi.spyOn(io, 'to').mockImplementation((target) => ({
    emit: (event, payload) => {
      const bucket = String(target).startsWith('room_') ? roomEvents : directEvents
      bucket.push({ target, event, payload })
    },
  }))

  const middleware = io.sockets._fns[0]
  const connect = io.sockets.listeners('connection')[0]

  return { io, middleware, connect, roomEvents, directEvents }
}

describe('socketHandler gateway', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('autentica con cookie y rechaza desafios invalidos', async () => {
    const { middleware, connect } = await createGatewayHarness()
    const socket = createSocket('alice', 'socket-alice')
    const next = vi.fn()

    middleware(socket, next)
    expect(socket.data.user).toEqual(expect.objectContaining({ username: 'alice' }))
    expect(next).toHaveBeenCalledWith()

    connect(socket)
    await socket.handlers.challenge_player({ opponentUsername: 'alice', boardSize: 6 })
    await socket.handlers.challenge_player({ opponentUsername: 'bob', boardSize: 6 })

    expect(socket.emit).toHaveBeenNthCalledWith(1, 'sync_board', { error: 'Rival invalido para el desafio' })
    expect(socket.emit).toHaveBeenNthCalledWith(2, 'sync_board', { error: 'El rival no esta conectado al modo multijugador' })
  })

  it('autentica con token en auth y rechaza token ausente o invalido', async () => {
    const { middleware } = await createGatewayHarness()
    const authSocket = createSocket('alice', 'socket-auth')
    const authToken = jwt.sign({ username: 'alice' }, JWT_SECRET, { expiresIn: '24h' })
    authSocket.handshake.auth.token = authToken
    authSocket.handshake.headers.cookie = ''
    const okNext = vi.fn()

    middleware(authSocket, okNext)
    expect(okNext).toHaveBeenCalledWith()
    expect(authSocket.data.user.username).toBe('alice')

    const missingTokenSocket = createSocket('alice', 'socket-missing')
    missingTokenSocket.handshake.auth = {}
    missingTokenSocket.handshake.headers = {}
    const missingNext = vi.fn()
    middleware(missingTokenSocket, missingNext)
    expect(missingNext.mock.calls[0][0].message).toBe('Token no proporcionado')

    const invalidTokenSocket = createSocket('alice', 'socket-invalid')
    invalidTokenSocket.handshake.auth.token = 'not-a-token'
    const invalidNext = vi.fn()
    middleware(invalidTokenSocket, invalidNext)
    expect(invalidNext.mock.calls[0][0].message).toBe('Token invalido o expirado')
  })

  it('rechaza cookie sin token y token ausente en cookie vacia', async () => {
    const { middleware } = await createGatewayHarness()

    const noTokenCookieSocket = createSocket('alice', 'socket-no-token-cookie')
    noTokenCookieSocket.handshake.auth = {}
    noTokenCookieSocket.handshake.headers.cookie = 'theme=dark; session=abc'
    const noTokenCookieNext = vi.fn()
    middleware(noTokenCookieSocket, noTokenCookieNext)
    expect(noTokenCookieNext.mock.calls[0][0].message).toBe('Token no proporcionado')

    const emptyCookieSocket = createSocket('alice', 'socket-empty-cookie')
    emptyCookieSocket.handshake.auth = {}
    emptyCookieSocket.handshake.headers.cookie = ''
    const emptyCookieNext = vi.fn()
    middleware(emptyCookieSocket, emptyCookieNext)
    expect(emptyCookieNext.mock.calls[0][0].message).toBe('Token no proporcionado')
  })

  it('desconecta sockets autenticados sin username', async () => {
    const { connect } = await createGatewayHarness()
    const socket = createSocket('', 'socket-empty')
    socket.data.user = { username: '   ' }

    connect(socket)

    expect(socket.disconnect).toHaveBeenCalledWith(true)
  })

  it('crea desafio, acepta partida y propaga desconexion del jugador', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        board: { size: 6, layout: '.', players: ['alice', 'bob'], turn: 0 },
        next_turn: 'alice',
      }),
    })

    const { io, middleware, connect, roomEvents, directEvents } = await createGatewayHarness()
    const alice = createSocket('alice', 'socket-alice')
    const bob = createSocket('bob', 'socket-bob')

    middleware(alice, vi.fn())
    connect(alice)
    io.sockets.sockets.set(alice.id, alice)

    middleware(bob, vi.fn())
    connect(bob)
    io.sockets.sockets.set(bob.id, bob)

    await alice.handlers.challenge_player({ opponentUsername: 'bob', boardSize: 7 })

    const sentChallenge = alice.emit.mock.calls.find(([event]) => event === 'challenge_player')?.[1]
    expect(sentChallenge).toEqual(expect.objectContaining({
      challenger: 'alice',
      target: 'bob',
      boardSize: 7,
      status: 'sent',
    }))
    expect(directEvents).toContainEqual({
      target: 'socket-bob',
      event: 'challenge_player',
      payload: expect.objectContaining({
        challengeId: sentChallenge.challengeId,
        challenger: 'alice',
        boardSize: 7,
      }),
    })

    await bob.handlers.accept_challenge({ challengeId: sentChallenge.challengeId })

    expect(fetchMock).toHaveBeenCalledWith('https://gamey.test/pvp/reset', expect.objectContaining({
      method: 'POST',
    }))
    expect(alice.join).toHaveBeenCalled()
    expect(bob.join).toHaveBeenCalled()

    const syncEvent = roomEvents.find(({ event }) => event === 'sync_board')
    expect(syncEvent).toBeTruthy()
    expect(syncEvent.payload).toEqual(expect.objectContaining({
      currentTurn: 'alice',
      winner: null,
    }))

    alice.handlers.disconnect()

    expect(roomEvents).toContainEqual({
      target: syncEvent.target,
      event: 'player_disconnected',
      payload: expect.objectContaining({
        username: 'alice',
        reason: 'disconnected',
      }),
    })
  })

  it('rechaza movimientos con indice invalido', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        board: { size: 6, layout: '.', players: ['alice', 'bob'], turn: 0 },
        next_turn: 'alice',
      }),
    })

    const { io, middleware, connect, roomEvents } = await createGatewayHarness()
    const alice = createSocket('alice', 'socket-alice')
    const bob = createSocket('bob', 'socket-bob')

    middleware(alice, vi.fn())
    connect(alice)
    io.sockets.sockets.set(alice.id, alice)

    middleware(bob, vi.fn())
    connect(bob)
    io.sockets.sockets.set(bob.id, bob)

    await alice.handlers.challenge_player({ opponentUsername: 'bob', boardSize: 6 })
    const sentChallenge = alice.emit.mock.calls.find(([event]) => event === 'challenge_player')?.[1]
    await bob.handlers.accept_challenge({ challengeId: sentChallenge.challengeId })
    const syncEvent = roomEvents.find(({ event }) => event === 'sync_board')
    await alice.handlers.game_move({ matchId: syncEvent?.payload?.matchId, cellIndex: -1 })

    expect(alice.emit).toHaveBeenCalledWith('sync_board', { error: 'Movimiento invalido' })
  })

  it('rechaza aceptar desafios inexistentes o de otro usuario', async () => {
    const harness = await createGatewayHarness()
    const alice = createSocket('alice', 'socket-alice')
    const bob = createSocket('bob', 'socket-bob')
    const carol = createSocket('carol', 'socket-carol')
    connectAuthenticated(harness, alice)
    connectAuthenticated(harness, bob)
    connectAuthenticated(harness, carol)

    await bob.handlers.accept_challenge({ challengeId: 'missing' })
    expect(bob.emit).toHaveBeenCalledWith('sync_board', { error: 'Desafio no disponible' })

    await alice.handlers.challenge_player({ opponentUsername: 'bob', boardSize: 6 })
    const challenge = alice.emit.mock.calls.find(([event]) => event === 'challenge_player')?.[1]
    await carol.handlers.accept_challenge({ challengeId: challenge.challengeId })

    expect(carol.emit).toHaveBeenCalledWith('sync_board', { error: 'No puedes aceptar este desafio' })
  })

  it('notifica error si Rust falla al crear partida', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: 'reset failed' }),
    })
    const harness = await createGatewayHarness()
    const alice = createSocket('alice', 'socket-alice')
    const bob = createSocket('bob', 'socket-bob')
    connectAuthenticated(harness, alice)
    connectAuthenticated(harness, bob)

    await alice.handlers.challenge_player({ opponentUsername: 'bob', boardSize: 6 })
    const challenge = alice.emit.mock.calls.find(([event]) => event === 'challenge_player')?.[1]
    await bob.handlers.accept_challenge({ challengeId: challenge.challengeId })

    expect(bob.emit).toHaveBeenCalledWith('sync_board', { error: 'reset failed' })
  })

  it('permite join_match y leave_match a jugadores de la partida', async () => {
    const fetchMock = vi.mocked(fetch)
    const harness = await createGatewayHarness()
    const { bob, matchId, roomId } = await createActiveMatch(harness, fetchMock)

    await bob.handlers.join_match({ matchId })
    expect(bob.join).toHaveBeenCalledWith(roomId)
    expect(bob.emit).toHaveBeenCalledWith('sync_board', expect.objectContaining({ matchId, roomId }))

    await bob.handlers.leave_match({ matchId })
    expect(harness.roomEvents).toContainEqual({
      target: roomId,
      event: 'player_disconnected',
      payload: expect.objectContaining({ username: 'bob', reason: 'left' }),
    })
  })

  it('ignora join_match y leave_match cuando la partida no existe', async () => {
    const harness = await createGatewayHarness()
    const alice = createSocket('alice', 'socket-alice')
    connectAuthenticated(harness, alice)

    await alice.handlers.join_match({ matchId: 'missing' })
    await alice.handlers.leave_match({ matchId: 'missing' })

    expect(alice.join).not.toHaveBeenCalled()
    expect(alice.emit).not.toHaveBeenCalledWith('sync_board', expect.anything())
    expect(harness.roomEvents).toHaveLength(0)
  })

  it('rechaza movimientos de sockets autenticados que no pertenecen a la partida', async () => {
    const fetchMock = vi.mocked(fetch)
    const harness = await createGatewayHarness()
    const { matchId } = await createActiveMatch(harness, fetchMock)
    const carol = createSocket('carol', 'socket-carol')
    connectAuthenticated(harness, carol)

    await carol.handlers.game_move({ matchId, cellIndex: 0 })

    expect(carol.emit).toHaveBeenCalledWith('sync_board', { error: 'No perteneces a esta partida' })
  })

  it('procesa movimientos validos y marca la partida como terminada si hay ganador', async () => {
    const fetchMock = vi.mocked(fetch)
    const harness = await createGatewayHarness()
    const { alice, matchId, roomId } = await createActiveMatch(harness, fetchMock)

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({
        board: { size: 6, layout: 'B', players: ['alice', 'bob'], turn: 1 },
        next_turn: 'bob',
        winner: 'alice',
      }),
    })

    await alice.handlers.game_move({ matchId, cellIndex: 0 })

    expect(fetchMock).toHaveBeenLastCalledWith('https://gamey.test/pvp/move', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ match_id: matchId, player: 'alice', index: 0 }),
    }))
    expect(harness.roomEvents).toContainEqual({
      target: roomId,
      event: 'sync_board',
      payload: expect.objectContaining({
        matchId,
        currentTurn: 'bob',
        winner: 'alice',
        lastMoveBy: 'alice',
        lastMoveCell: 0,
      }),
    })

    await alice.handlers.game_move({ matchId, cellIndex: 1 })
    expect(alice.emit).toHaveBeenCalledWith('sync_board', { error: 'Partida no activa o inexistente' })
  })

  it('rechaza movimientos fuera de turno y errores de Rust', async () => {
    const fetchMock = vi.mocked(fetch)
    const harness = await createGatewayHarness()
    const { alice, bob, matchId } = await createActiveMatch(harness, fetchMock)

    await bob.handlers.game_move({ matchId, cellIndex: 0 })
    expect(bob.emit).toHaveBeenCalledWith('sync_board', { error: 'No es tu turno' })

    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: 'move failed' }),
    })
    await alice.handlers.game_move({ matchId, cellIndex: 0 })
    expect(alice.emit).toHaveBeenCalledWith('sync_board', { error: 'move failed' })
  })
})
