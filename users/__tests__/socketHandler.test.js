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
})
