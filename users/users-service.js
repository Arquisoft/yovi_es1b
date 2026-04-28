// Node.js Server

const https = require('node:https');
const http = require('node:http');
const fs = require('node:fs');

const mongoose = require('mongoose');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('./models/user');
const Friendship = require('./models/friendship');

const express = require('express');
const app = express();


const port = 3000;


const swaggerUi = require('swagger-ui-express');
const YAML = require('js-yaml');
const promBundle = require('express-prom-bundle');
const { createSocketGateway } = require('./socketHandler');

const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  promClient: {
    collectDefaultMetrics: {} // activa métricas de CPU, Memoria, etc.
  }
});
app.use(metricsMiddleware);

const bcrypt = require('bcryptjs');
const saltRounds = 10; // Nivel de seguridad para el hash de la contraseña
//imports para tokens
const { authMiddleware, optionalAuthMiddleware, JWT_SECRET } = require('./authMiddleware');
const jwt = require('jsonwebtoken');

const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Para guardar un friendCode
const { customAlphabet } = require('nanoid');
// Alfabeto sin letras confusas (evitamos O, 0, I, l)
const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const generateFriendCode = customAlphabet(alphabet, 6); // Genera algo como "K8S2NW"
const MAX_NICKNAME_LENGTH = 15;
const { setGlobalDispatcher, Agent } = require('undici');


// Esto le dice a Node: "Confía en todos los servidores HTTPS locales aunque no tengan certificado oficial"
setGlobalDispatcher(new Agent({ connect: { rejectUnauthorized: false } }));

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');

// URL del servicio de Rust (GameY); se inyecta desde docker-compose o se usa localhost por defecto
const GAMEY_URL = process.env.GAMEY_SERVICE_URL || 'https://gamey:3000';
const tokenCookieOptions = {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'Lax',
    maxAge: 86400000
};

  /**
 * Intenta cargar la configuración SSL desde rutas predefinidas.
 * Se extrae a una función para permitir pruebas unitarias y aislamiento.
 */
const loadSSLConfig = () => {
  // En entorno de test, por defecto devolvemos null para no interferir
  // con el servidor de pruebas a menos que lo forcemos manualmente.
  if (process.env.NODE_ENV === 'test' && !process.env.FORCE_SSL_TEST) {
    return null;
  }

  try {
    const keyPath = fs.existsSync('/certs/key.pem')
      ? '/certs/key.pem'
      : path.join(__dirname, '../certs/key.pem');

    const certPath = fs.existsSync('/certs/cert.pem')
      ? '/certs/cert.pem'
      : path.join(__dirname, '../certs/cert.pem');

    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      const config = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      };
      console.log("🔒 Certificados SSL cargados correctamente.");
      return config;
    }
  } catch (err) {
    // SEGURIDAD: Logueamos el error completo internamente para debug
    console.error("Error técnico al cargar SSL:", err);
    // Pero al log de advertencia enviamos un mensaje genérico sin 'err.message'
    console.warn("No se pudieron cargar los certificados SSL, se usará HTTP por defecto.");
  }
  return null;
};

// Inicializamos la variable usando la función
//const sslOptions = loadSSLConfig();

// IMPORTANTE: Exporta la función al final del archivo para que el test pueda verla
// (Usa module.exports o export dependiendo de tu sistema de módulos)
module.exports = { app, loadSSLConfig };


const normalizeIconName = (rawValue) => {
  const value = String(rawValue || '').trim();
  if (!value) return 'SinAvatar.png';
  const normalized = value.replaceAll('\\', '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1] || 'SinAvatar.png';
};

const setupSwagger = (app) => {
  try {
    const swaggerDocument = YAML.load(fs.readFileSync('./openapi.yaml', 'utf8'));
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  } catch (e) {
    console.log("⚠️ Error al cargar la documentación Swagger:", e.message);
  }
};

// Ejecución inmediata para el funcionamiento normal del servidor
setupSwagger(app);

const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || 'https://localhost,http://localhost,https://localhost:5173,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

// CORS
app.use((req, res, next) => {
  const rawOrigin  = req.headers.origin;
  //Permitir solo http(s) de origenes válidos
  const origin = typeof rawOrigin === 'string' && /^https?:\/\/[\w-.]+(?::\d+)?$/.test(rawOrigin)
      ? rawOrigin
      : null;
  if (origin && allowedOrigins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());




// --- ENDPOINTS (Controllers) ---

app.get('/', (req, res) => {
  res.status(200).json({ status: 'ready', message: 'Users Service is up and running' });
});


// ACTION --> Someone sends a Name and we respond with a Welcome Message
app.post('/createuser', async (req, res) => {
  // para evitar inyecciones de codigo, convertimos a string lo que recibimos del cliente
  const username = String(req.body.username || "");
  const nickname = String(req.body.nickname || "").trim();
  const password = String(req.body.password || "");
  const birthDate = req.body.birthDate ? new Date(String(req.body.birthDate)) : null;
  const language = String(req.body.language || req.body.country || "").trim();
  const iconName = normalizeIconName(req.body.iconName || req.body.icon);
  try {
    if (!username || !password || !language || !birthDate || !nickname) {
      return res.status(400).json({ error: "Username, nickname, password, language and birthDate are required" });
    }
    if (nickname.length > MAX_NICKNAME_LENGTH) {
      return res.status(400).json({ error: `Nickname must be at most ${MAX_NICKNAME_LENGTH} characters` });
    }
    if (Number.isNaN(birthDate.getTime())) {
      return res.status(400).json({ error: "birthDate is invalid" });
    }
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(409).json({ error: "Username already exists" });
    }

    let friendCode;
    let isUnique = false;
    while (!isUnique) {
      friendCode = generateFriendCode();
      const existingCode = await User.findOne({ friendCode });
      if (!existingCode) {
        isUnique = true;
      }
    }
    
    // Encriptar
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = new User ({
      username,
      password: hashedPassword,
      friendCode,
      birthDate,
      language,
      nickname,
      iconName
    })

    // Save the new user to the database
    await newUser.save();

    const token = jwt.sign(
        { username: newUser.username, nickname: newUser.nickname },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
    res.cookie('token', token, tokenCookieOptions);

    res.json({
      message: `Hello ${username}! Your account has been created!`,
      friendCode: `#${friendCode}`,
      nickname,
      username: newUser.username,
      token
    })

  } catch (err) {
    res.status(400).json({ error: "User already exists or database error" });
  }
});


// ACTION --> Log in with username and password
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {

    const loginValue = String(username || '').trim();
    const user = await User.findOne({ username: loginValue });

    if (!user) {
      return res.status(401).json({ error: "Usuario o contraseña incorrecta" });
    }

    // comparar contraseñas
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      const token = jwt.sign(
          { username: user.username, nickname: user.nickname },
          JWT_SECRET,
          { expiresIn: '24h' }
      );

      res.cookie('token', token, tokenCookieOptions);

      res.json({
        message: `Welcome back, ${username}!`,
        username: user.username,
        nickname: user.nickname,
        language: user.language,
        score: user.score,
        iconName: user.iconName,
        friendCode: user.friendCode,
        token
      });
    } else {
      res.status(401).json({ error: "Usuario o contraseña incorrecta" });
    }
      
  } catch (err) {
    res.status(500).json({ error: "Error del servidor. " + err.message });
  }
})

app.post('/logout', (req, res) => {
    res.cookie('token', '', { ...tokenCookieOptions, maxAge: undefined, expires: new Date(0) });
    res.json({ message: 'Logout exitoso' });
});

app.get('/users/search', authMiddleware, async (req, res) => {
  const query = String(req.query.query || '').trim();
  
  try {
    let searchCriteria = {};

    // Si la búsqueda empieza por #, buscamos coincidencia exacta por friendCode
    if (query.startsWith('#')) {
      // Quitamos el # para buscar en la base de datos
      const cleanCode = query.substring(1).toUpperCase();
      searchCriteria = { friendCode: cleanCode };
    } else {
      // Si no hay #, buscamos por nombre (insensible a mayúsculas)
      searchCriteria = { username: { $regex: query, $options: 'i' } };
    }

    const users = await User.find(searchCriteria)
      .select('username icon friendCode')
      .limit(10);

    res.json(users);
  } catch (err) {
    console.error("Error en búsqueda:", err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/users/follow', authMiddleware, async (req, res) => {
  const { follower, following } = req.body;
  try {
    // Buscamos si ya existe una relación (da igual el orden)
    const existing = await Friendship.findOne({
      users: { $all: [follower, following] }
    });

    if (existing) {
      return res.status(400).json({ error: 'Ya existe una solicitud o amistad' });
    }

    // Creamos la solicitud pendiente
    const newRequest = new Friendship({
      users: [follower, following],
      status: 'pending'
    });
    await newRequest.save();

    res.json({ message: 'Solicitud enviada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al enviar solicitud. ' + err.message });
  }
});

// En users-service.js
app.get('/users/profile/:username', authMiddleware, async (req, res) => {
  const username = String(req.params.username || '').trim();

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json({
      username: user.username,
      nickname: user.nickname,
      birthDate: user.birthDate,
      language: user.language,
      iconName: user.iconName,
      totalScore: user.totalScore || 0,
      followingCount: user.following?.length || 0,
      followersCount: user.followers?.length || 0
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error del servidor: ' + err.message });
  }
}); 


app.patch('/users/profile/:username', authMiddleware, async (req, res) => {
  const username = String(req.params.username || '').trim();
  const language = req.body.language !== undefined ? String(req.body.language || '').trim() : undefined;
  const iconName = req.body.iconName !== undefined ? normalizeIconName(req.body.iconName) : undefined;
  const nickname = req.body.nickname !== undefined ? String(req.body.nickname || '').trim() : undefined;
  const birthDateRaw = req.body.birthDate;

  if (!username) {
    return res.status(400).json({ error: 'Username es obligatorio' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (language !== undefined) {
      if (!language) {
        return res.status(400).json({ error: 'Idioma no puede estar vacio' });
      }
      user.language = language;
    }

    if (nickname !== undefined) {
      if (!nickname) {
        return res.status(400).json({ error: 'Nickname no puede estar vacio' });
      }
      if (nickname.length > MAX_NICKNAME_LENGTH) {
        return res.status(400).json({ error: `Nickname no puede tener mas de ${MAX_NICKNAME_LENGTH} caracteres` });
      }
      const existingNickname = await User.findOne({ nickname });
      if (existingNickname && String(existingNickname._id) !== String(user._id)) {
        return res.status(409).json({ error: 'Nickname ya existe' });
      }
      user.nickname = nickname;
    }

    if (iconName !== undefined) {
      user.iconName = iconName;
    }

    if (birthDateRaw !== undefined) {
      const parsedDate = birthDateRaw ? new Date(String(birthDateRaw)) : null;
      if (birthDateRaw && Number.isNaN(parsedDate?.getTime?.())) {
        return res.status(400).json({ error: 'Fecha de nacimiento inválida' });
      }
      user.birthDate = parsedDate;
    }

    await user.save();

    return res.json({
      message: 'Perfil actualizado correctamente',
      username: user.username,
      nickname: user.nickname,
      birthDate: user.birthDate,
      language: user.language,
      iconName: user.iconName
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error del servidor. ' + err.message });
  }
});

app.post('/users/profile/:username/change-password', authMiddleware, async (req, res) => {
  const username = String(req.params.username || '').trim();
  const currentPassword = String(req.body.currentPassword || '');
  const newPassword = String(req.body.newPassword || '');

  if (!username || !currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Username, contraseña actual y nueva contraseña son obligatorios' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const validCurrentPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validCurrentPassword) {
      return res.status(401).json({ error: 'La contraseña actual no es correcta' });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ error: 'La nueva contraseña debe ser distinta de la actual' });
    }

    user.password = await bcrypt.hash(newPassword, saltRounds);
    await user.save();

    return res.json({ message: 'contraseña actualizada correctamente' });
  } catch (err) {
    return res.status(500).json({ error: 'Error del servidor. ' + err.message });
  }
});

app.get('/friends', authMiddleware, async (req, res) => {
  const username = String(req.query.username || '').trim();
  if (!username) return res.status(400).json({ error: 'Username required' });

  try {
    const friendships = await Friendship.find({
      users: username,
      status: 'accepted'
    });

    const friendsList = friendships.map(f => {
      const friendName = f.users.find(u => u !== username);
      return { name: friendName, status: 'online' };
    });

    res.json(friendsList);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching friends. ' + err.message });
  }
});

// Obtener solicitudes que me han enviado a mí (pendientes)
app.get('/friends/requests', authMiddleware, async (req, res) => {
  const username = String(req.query.username || '').trim();
  try {
    const pendingRequests = await Friendship.find({
      users: username,
      status: 'pending'
    });
    
    // Devolvemos solo el nombre de la persona que envió la solicitud
    const requests = pendingRequests.map(fr => {
        const sender = fr.users.find(u => u !== username);
        return { sender, id: fr._id };
    });
    
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener solicitudes. ' + err.message });
  }
});

// Aceptar o Rechazar solicitud
app.post('/friends/respond', authMiddleware, async (req, res) => {
  const { requestId, action } = req.body; // action: 'accepted' o 'rejected'

  try {
    if (action === 'rejected') {
      await Friendship.findByIdAndDelete(requestId);
      return res.json({ message: 'Solicitud rechazada' });
    }

    const friendship = await Friendship.findByIdAndUpdate(requestId, { 
      status: 'accepted' 
    }, { new: true });

    res.json({ message: '¡Ahora sois amigos!', friendship });
  } catch (err) {
    res.status(500).json({ error: 'Error al responder solicitud. ' + err.message });
  }
});

/**
 * Endpoint para obtener el perfil público de un usuario, incluyendo estadísticas de juego.
 */
app.get('/users/public-profile/:username', authMiddleware, async (req, res) => {
  const targetUsername = String(req.params.username || '').trim();
  const requester = String(req.query.requester || '').trim();
  const isOwnProfile = requester.localeCompare(targetUsername, undefined, { sensitivity: 'accent' }) === 0;
  try {
    // Buscar los campos públicos del usuario
    const user = await User.findOne({ username: targetUsername })
      .select('username nickname iconName friendCode');

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Buscar relacion
    let relationship = 'none';
    if (isOwnProfile) {
      relationship = 'self';
    } else {
      const friendship = await Friendship.findOne({
        users: {$all: [requester, targetUsername] } 
      });
      if (friendship) {
        relationship = friendship.status; // pending, accepted, etc.
      }
    }

    // Pedir estadisticas de juego al servicio de Rust
    let gameStats = { wins: 0, losses: 0, totalGames: 0 };

    try {
      const rustResponse = await fetch(`${GAMEY_URL}/stats?username=${targetUsername}`);
      if (rustResponse.ok) {

        const rustStats = await rustResponse.json();
        gameStats = {
          wins: rustStats.wins,
          losses: rustStats.losses,
          totalGames: rustStats.total, // Transformamos "total" en "totalGames"
          totalScore: rustStats.total_score // Nuevo campo para puntos totales
        };
      }
    }catch (e) {
      console.error("Error fetching stats from Rust:", e);
    }

    res.json({
      username: user.username,
      nickname: user.nickname,
      iconName: user.iconName,
      friendCode: user.friendCode,
      stats: gameStats,
      relationship
    });

  } catch (err) {
    res.status(500).json({ error: 'Error del servidor. ' + err.message });
  }
})

const normalizeDifficulty = (difficulty) =>
  String(difficulty || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .replaceAll(/\s+/g, '');

const calculateVictoryScore = (difficulty, boardSize) => {
  const size = Number(boardSize);
  if (!Number.isFinite(size) || size <= 0) return 0;

  const normalizedDifficulty = normalizeDifficulty(difficulty);
  if (!normalizedDifficulty || normalizedDifficulty === 'sinseleccionar') return 0;

  let multiplier = 1;
  if (normalizedDifficulty === 'medio' || normalizedDifficulty === 'medium') {
    multiplier = 2;
  } else if (normalizedDifficulty === 'dificil' || normalizedDifficulty === 'hard') {
    multiplier = 3;
  }

  return Math.round(100 * multiplier * (size / 6));
};

/**
 * Endpoint para cancelar una solicitud de amistad pendiente
 */
app.post('/friends/cancel', authMiddleware, async (req, res) => {
  const { follower, following } = req.body;
  try {
    // Buscamos la relación pendiente donde nosotros somos uno de los involucrados
    await Friendship.findOneAndDelete({
      users: { $all: [follower, following] },
      status: 'pending'
    });
    res.json({ message: 'Solicitud cancelada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al cancelar la solicitud. ' + err.message });
  }
});

// Executes a move in the game
app.post('/move', optionalAuthMiddleware, async (req, res) => {
    // CORRECCIÓN: Extraer username del body
    const { cellIndex, username, difficulty, boardSize, boardLabel, locale, resultLabel } = req.body;

  try {
    //  Integración: Llamada al servicio de Rust
    const rustResponse = await fetch(`${GAMEY_URL}/execute-move`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
         index: cellIndex,
         player: username,
         difficulty,
         board_size: boardSize,
         board_label: boardLabel,
         locale,
         result_label: resultLabel,
      })
    });

   if (!rustResponse.ok) {
    const text = await rustResponse.text();

    const safeText = text.replaceAll(/[\n\r]/g, '_');

    console.error("Error técnico desde Rust: " + safeText);

    return res.status(500).json({ error: "Error en la comunicación con el juego" });
}

        const newBoard = await rustResponse.json();
        const fallbackScore = calculateVictoryScore(difficulty, boardSize);
        const finalScore = typeof newBoard.score === 'number' && newBoard.score > 0
            ? newBoard.score
            : fallbackScore;

    // Si Rust dice que hay un ganador y ese ganador es el humano (ID 0)
    if (newBoard.winner === 0 && finalScore > 0) {
    // 2. SANITIZACIÓN: Aseguramos que es un string y un número
    const safeUsername = String(username || '').trim();
    const awardedScore = Number(finalScore);

    // Solo acreditamos puntos si el usuario está autenticado y coincide con el body.
    if (req.user?.username && req.user.username === safeUsername) {
      await User.findOneAndUpdate(
          { username: safeUsername }, // Filtro protegido contra objetos/inyecciones
          { $inc: { totalScore: awardedScore } }
      );
    }
}

    //  Respuesta HTTP
    res.json({ 
      responseFromRust: newBoard.board,
      winner: newBoard.winner,
      score: newBoard.score || finalScore // Nuevo campo para el puntaje de la partida
    });
  }
  catch (e) {
    console.error(e);
    res.status(500).json({error: 'Error communicating with Rust server. ' + e.message});
  }
});

//  Endpoint para registrar una rendición (derrota)
app.post('/surrender', optionalAuthMiddleware, async (req, res) => {
  const { username, difficulty, boardSize, boardLabel, locale, resultLabel } = req.body;

  try {
    //  Integración: Llamada al servicio de Rust (GameY)
    const rustResponse = await fetch(`${GAMEY_URL}/surrender`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player: username,       // Rust espera "player"
        difficulty: difficulty,
        board_size: boardSize,   // Rust espera "board_size"
        board_label: boardLabel,
        locale,
        result_label: resultLabel,
      })
    });

    //  Control de errores de la respuesta de Rust
    if (!rustResponse.ok) {
    const text = await rustResponse.text();
    const safeLog = text.replaceAll(/[\n\r]/g, '_');
    console.error("Error desde Rust en surrender:", safeLog);

    return res.status(rustResponse.status).json({
        error: "No se pudo procesar la rendición en este momento."
    });
}

    const data = await rustResponse.json();

    //  Respuesta al Frontend
    res.json({ 
      message: "Rendición registrada correctamente",
      details: data 
    });

  } catch (e) {
    console.error("Error de conexión con Rust en surrender:", e);
    res.status(500).json({ error: 'Error communicating with Rust server. ' + e.message });
  }
});


// Resets the game board WITHOUT affecting stats
app.post('/reset', optionalAuthMiddleware, async (req, res) => {
  const { size, difficulty, username } = req.body;

  try {
    const requestedSize = Number(size);
    const safeSize = Number.isFinite(requestedSize) && requestedSize >= 3 && requestedSize <= 20
        ? Math.floor(requestedSize)
        : 5;

    // USAMOS UN DISPATCHER PARA IGNORAR EL SSL AUTOFIRMADO DE RUST
    const rustResponse = await fetch(`${GAMEY_URL}/reset`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        size: safeSize,
        difficulty: difficulty,
        player: username
      }),
      // Esta es la parte clave para que el fetch no muera
      dispatcher: new Agent({
        connect: { rejectUnauthorized: false,
        timeout: 60000
        }
      })
    });

    if (!rustResponse.ok) {
      throw new Error(`Rust error: ${rustResponse.status}`);
    }

    const newBoard = await rustResponse.json();
    res.json({ responseFromRust: newBoard });

  } catch (e) {
    console.error("Fallo en reset:", e.message);
    res.status(500).json({ error: 'Error communicating with Rust server. ' + e.message });
  }
});


// Get available difficulties
app.get('/difficulties', optionalAuthMiddleware, async (req, res) => {
  try {
    const rustResponse = await fetch(`${GAMEY_URL}/difficulties`);
    if (!rustResponse.ok) {
      throw new Error('Failed to fetch difficulties from Rust');
    }
    const difficulties = await rustResponse.json();
    res.json(difficulties);
  } catch (e) {
    console.error(e);
    res.status(500).json({error: 'Error fetching difficulties'});
  }
});


// Para el historial
app.get('/history', authMiddleware, async (req, res) => {
  // 1. Extraemos TODOS los parámetros de la URL, incluido 'result'
  const { username, page = 1, limit = 10, result } = req.query;
  
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    // 2. Construimos la URL como un simple string (let, no const, porque va a cambiar)
    let rustUrl = `${GAMEY_URL}/history?username=${username}&page=${page}&limit=${limit}`;
    
    // 3. Modificamos el string si hay filtro
    if (result) {
        rustUrl += `&result=${encodeURIComponent(result)}`;
    }

    // 4. AHORA Sí, ejecutamos el fetch pasándole el string de la URL
    const rustResponse = await fetch(rustUrl);

    if (!rustResponse.ok) {
      console.error(`Error en Rust: ${rustResponse.status}`);
      return res.status(rustResponse.status).json({ error: "Rust history service error" });
    }
    
    const paginatedData = await rustResponse.json();

    console.log('Historial de partidas consultado correctamente.');

    // 5. Enviamos el array directo al Frontend
    res.json(paginatedData); 
    
  } catch (e) {
    console.error("Error de conexión con Rust:", e);
    res.status(500).json({ error: 'No se pudo conectar con el servicio de Rust' });
  }
});

/**
 * Endpoint para comprar puntos de experiencia (XP) y acreditarlos al usuario
 */
app.post('/users/purchase-xp', async (req, res) => {
  const { username, amount } = req.body;

  try {
    const safeUsername = String(username || '').trim();
    const safeAmount = Number(amount);

   if (Number.isNaN(safeAmount)) {
    return res.status(400).json({ error: "Cantidad no válida" });
    }

    const updatedUser = await User.findOneAndUpdate(
      { username: safeUsername },
      { $inc: { totalScore: safeAmount } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ message: "Puntos acreditados", total: updatedUser.totalScore });

  } catch (e) {
    console.error("Error en purchase-xp:", e);
    res.status(500).json({ error: "No se pudo procesar la compra." });
  }
});

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', promBundle.promClient.register.contentType);
    res.end(await promBundle.promClient.register.metrics());
});


if (require.main === module) {
  // 1. Conexión a DB
  mongoose.connect(process.env.MONGODB_URI_USERS)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ Could not connect to MongoDB', err));

  // 2. Carga de certificados (Usando la función que ya tienes)
  const sslOptions = loadSSLConfig(); 

  // 3. Creación del servidor (HTTPS si hay certs, si no HTTP)
  const server = sslOptions 
    ? https.createServer(sslOptions, app) 
    : http.createServer(app);

  // 4. Configuración de Sockets (Si los usas)
  if (typeof createSocketGateway === 'function') {
    createSocketGateway(server, { gameyUrl: GAMEY_URL });
  }

  // 5. EL ÚNICO LISTEN
  server.listen(port, '0.0.0.0', () => {
    const protocol = sslOptions ? 'HTTPS' : 'HTTP';
    console.log(`🚀 User Service (${protocol}) escuchando en el puerto ${port}`);
  });
}

app.post('/api/play', async (req, res) => {
  const { position, bot_id } = req.body;

  try {
    const rustResponse = await fetch(`${GAMEY_URL}/api/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position, bot_id }),
      dispatcher: new Agent({
        connect: { rejectUnauthorized: false, timeout: 60000 }
      })
    });

    if (!rustResponse.ok) {
      const errorText = await rustResponse.text();
      
      // 1. Sanitizamos el texto eliminando saltos de línea y retornos de carro
      // Esto evita que un atacante inyecte nuevas líneas en el log
      const sanitizedError = errorText.replace(/[\n\r]/g, ' '); 
      
      // 2. Logueamos la versión limpia
      console.error("Rust devolvió un error:", sanitizedError);

      return res.status(rustResponse.status).json({
          error: "El motor de juego rechazó la petición",
          details: errorText // Aquí sí puedes enviar el original al cliente si quieres
      });
    }

    const data = await rustResponse.json();
    res.json(data);

  } catch (e) {
    console.error("Fallo detallado en /api/play:", e);
    res.status(500).json({ error: 'Error comunicando con el motor de juego' });
  }
});


app.get('/api/bots', async (req, res) => {
  try {
    const rustResponse = await fetch(`${GAMEY_URL}/api/bots`, {
      method: 'GET',
      dispatcher: new Agent({
        connect: { rejectUnauthorized: false }
      })
    });
    const data = await rustResponse.json();
    res.json(data);
  } catch (e) {
    console.error("Fallo detallado en /api/bots:", e);
    res.status(500).json({ error: 'No se pudo obtener la lista de bots' });
  }
});

// En lugar de module.exports = { app, loadSSLConfig };
// Hacemos esto para no romper los tests existentes:

module.exports = app;
module.exports.loadSSLConfig = loadSSLConfig;
module.exports.normalizeIconName = normalizeIconName;
module.exports.setupSwagger = setupSwagger;
