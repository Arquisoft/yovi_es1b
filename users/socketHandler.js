const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { customAlphabet } = require('nanoid');
const { JWT_SECRET } = require('./authMiddleware');

const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const createId = customAlphabet(alphabet, 10);

const allowedSocketOrigins = (process.env.ALLOWED_SOCKET_ORIGINS || process.env.ALLOWED_ORIGINS || 'https://localhost,http://localhost,https://localhost:5173,http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const parseCookieToken = (cookieHeader) => {
  if (!cookieHeader) return null;
  const parts = String(cookieHeader).split(';').map((part) => part.trim());
  const tokenPart = parts.find((part) => part.startsWith('token='));
  if (!tokenPart) return null;
  return decodeURIComponent(tokenPart.slice('token='.length));
};

const emitToUsername = (io, userSockets, username, eventName, payload) => {
  const sockets = userSockets.get(username);
  if (!sockets || sockets.size === 0) return;
  sockets.forEach((socketId) => {
    io.to(socketId).emit(eventName, payload);
  });
};

const createSocketGateway = (httpServer, { gameyUrl }) => {
  const io = new Server(httpServer, {
    cors: {
      origin: allowedSocketOrigins,
      credentials: true,
    },
  });

  const userSockets = new Map();
  const challenges = new Map();
  const matches = new Map();

  io.use((socket, next) => {
    try {
      const authToken = socket.handshake.auth?.token;
      const cookieToken = parseCookieToken(socket.handshake.headers?.cookie);
      const token = authToken || cookieToken;
      if (!token) return next(new Error('Token no proporcionado'));
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.data.user = decoded;
      return next();
    } catch (error) {
      console.warn('Socket authentication failed:', error.message);
      return next(new Error('Token invalido o expirado'));
    }
  });

  io.on('connection', (socket) => {
    const username = String(socket.data.user?.username || '').trim();
    if (!username) {
      socket.disconnect(true);
      return;
    }

    const existingSockets = userSockets.get(username) || new Set();
    existingSockets.add(socket.id);
    userSockets.set(username, existingSockets);

    socket.on('challenge_player', async (payload = {}) => {
      const opponentUsername = String(payload.opponentUsername || '').trim();
      const boardSize = Number(payload.boardSize) || 6;

      if (!opponentUsername || opponentUsername === username) {
        socket.emit('sync_board', { error: 'Rival invalido para el desafio' });
        return;
      }
      if (!userSockets.has(opponentUsername)) {
        socket.emit('sync_board', { error: 'El rival no esta conectado al modo multijugador' });
        return;
      }

      const challengeId = createId();
      challenges.set(challengeId, {
        challengeId,
        challenger: username,
        target: opponentUsername,
        boardSize,
        createdAt: Date.now(),
        status: 'pending',
      });

      emitToUsername(io, userSockets, opponentUsername, 'challenge_player', {
        challengeId,
        challenger: username,
        boardSize,
      });

      socket.emit('challenge_player', {
        challengeId,
        challenger: username,
        target: opponentUsername,
        boardSize,
        status: 'sent',
      });
    });

    socket.on('accept_challenge', async (payload = {}) => {
      const challengeId = String(payload.challengeId || '').trim();
      const challenge = challenges.get(challengeId);

      if (challenge?.status !== 'pending') {
        socket.emit('sync_board', { error: 'Desafio no disponible' });
        return;
      }
      if (challenge.target !== username) {
        socket.emit('sync_board', { error: 'No puedes aceptar este desafio' });
        return;
      }

      const challenger = challenge.challenger;
      const acceptedPlayer = challenge.target;
      const matchId = createId();
      const roomId = `room_${matchId}`;

      try {
        const rustResponse = await fetch(`${gameyUrl}/pvp/reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            match_id: matchId,
            size: challenge.boardSize,
            players: [challenger, acceptedPlayer],
          }),
        });

        const rustPayload = await rustResponse.json();
        if (!rustResponse.ok || rustPayload.error) {
          throw new Error(rustPayload.error || 'No se pudo crear la partida');
        }

        const matchState = {
          matchId,
          roomId,
          players: [challenger, acceptedPlayer],
          board: rustPayload.board,
          currentTurn: String(rustPayload.next_turn || challenger),
          winner: null,
          status: 'active',
        };

        matches.set(matchId, matchState);
        challenge.status = 'accepted';

        const challengerSockets = userSockets.get(challenger) || new Set();
        challengerSockets.forEach((socketId) => {
          const challengerSocket = io.sockets.sockets.get(socketId);
          challengerSocket?.join(roomId);
        });

        const targetSockets = userSockets.get(acceptedPlayer) || new Set();
        targetSockets.forEach((socketId) => {
          const targetSocket = io.sockets.sockets.get(socketId);
          targetSocket?.join(roomId);
        });

        // Aseguramos que el socket que acaba de aceptar se una a la sala
        socket.join(roomId);

        io.to(roomId).emit('sync_board', {
          matchId,
          roomId,
          board: matchState.board,
          players: matchState.players,
          currentTurn: matchState.currentTurn,
          winner: null,
        });
      } catch (error) {
        socket.emit('sync_board', { error: error.message || 'Error creando partida multijugador' });
      }
    });

    socket.on('join_match', (payload = {}) => {
      const matchId = String(payload.matchId || '').trim();
      const matchState = matches.get(matchId);
      if (!matchState) return;
      if (!matchState.players.includes(username)) return;

      socket.join(matchState.roomId);
      socket.emit('sync_board', {
        matchId,
        roomId: matchState.roomId,
        board: matchState.board,
        players: matchState.players,
        currentTurn: matchState.currentTurn,
        winner: matchState.winner,
      });
    });

    const closeActiveMatchForUser = (reason) => {
      matches.forEach((matchState, activeMatchId) => {
        if (!matchState.players.includes(username) || matchState.status !== 'active') return;

        matchState.status = 'abandoned';
        io.to(matchState.roomId).emit('player_disconnected', {
          matchId: matchState.matchId,
          username,
          reason,
        });
        matches.delete(activeMatchId);
      });
    };

    socket.on('leave_match', (payload = {}) => {
      const matchId = String(payload.matchId || '').trim();
      const matchState = matches.get(matchId);
      if (!matchState || !matchState.players.includes(username)) return;
      closeActiveMatchForUser('left');
    });

    socket.on('game_move', async (payload = {}) => {
      console.log(`📡 [socketHandler] GAME_MOVE RECIBIDO de ${username}:`, payload);
      const matchId = String(payload.matchId || '').trim();
      const cellIndex = Number(payload.cellIndex);
      const matchState = matches.get(matchId);

      if (!matchState || matchState.status !== 'active') {
        console.warn(`⚠️ [socketHandler] GAME_MOVE RECHAZADO: Partida inactiva`, { matchId });
        socket.emit('sync_board', { error: 'Partida no activa o inexistente' });
        return;
      }
      if (!Number.isInteger(cellIndex) || cellIndex < 0) {
        console.warn(`⚠️ [socketHandler] GAME_MOVE RECHAZADO: Índice inválido`, { cellIndex });
        socket.emit('sync_board', { error: 'Movimiento invalido' });
        return;
      }
      if (!matchState.players.includes(username)) {
        console.warn(`⚠️ [socketHandler] GAME_MOVE RECHAZADO: Jugador no pertenece`, { username, players: matchState.players });
        socket.emit('sync_board', { error: 'No perteneces a esta partida' });
        return;
      }
      if (matchState.currentTurn !== username) {
        console.warn(`⚠️ [socketHandler] GAME_MOVE RECHAZADO: Turno incorrecto`, { currentTurn: matchState.currentTurn, username });
        socket.emit('sync_board', { error: 'No es tu turno' });
        return;
      }

      console.log(`✅ [socketHandler] GAME_MOVE ACEPTADO. Enviando a Rust...`);
      try {
        const rustResponse = await fetch(`${gameyUrl}/pvp/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            match_id: matchId,
            player: username,
            index: cellIndex,
          }),
        });

        const rustPayload = await rustResponse.json();
        if (!rustResponse.ok || rustPayload.error) {
          throw new Error(rustPayload.error || 'Error al procesar movimiento');
        }

        matchState.board = rustPayload.board;
        matchState.currentTurn = String(rustPayload.next_turn || matchState.currentTurn);
        matchState.winner = rustPayload.winner || null;
        if (matchState.winner) {
          matchState.status = 'finished';
        }

        io.to(matchState.roomId).emit('sync_board', {
          matchId,
          roomId: matchState.roomId,
          board: matchState.board,
          players: matchState.players,
          currentTurn: matchState.currentTurn,
          winner: matchState.winner,
          lastMoveBy: username,
          lastMoveCell: cellIndex,
        });
      } catch (error) {
        socket.emit('sync_board', { error: error.message || 'Error en movimiento multijugador' });
      }
    });

    socket.on('disconnect', () => {
      const userSet = userSockets.get(username);
      if (userSet) {
        userSet.delete(socket.id);
        if (userSet.size === 0) {
          userSockets.delete(username);
        }
      }

      closeActiveMatchForUser('disconnected');
    });
  });

  return io;
};

module.exports = {
  createSocketGateway,
};

