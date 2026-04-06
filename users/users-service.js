// Node.js Server

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('./models/user');
const Friendship = require('./models/friendship');

const express = require('express');
const app = express();
const port = 3000;
const swaggerUi = require('swagger-ui-express');
const fs = require('node:fs');
const YAML = require('js-yaml');
const promBundle = require('express-prom-bundle');

const metricsMiddleware = promBundle({includeMethod: true});
app.use(metricsMiddleware);

const bcrypt = require('bcryptjs');
const saltRounds = 10; // Nivel de seguridad para el hash de la contraseña
//imports para tokens
const { authMiddleware, JWT_SECRET } = require('./authMiddleware');
const jwt = require('jsonwebtoken');

// Para guardar un friendCode
const { customAlphabet } = require('nanoid');
// Alfabeto sin letras confusas (evitamos O, 0, I, l)
const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const generateFriendCode = customAlphabet(alphabet, 6); // Genera algo como "K8S2NW"

// URL del servicio de Rust (GameY); se inyecta desde docker-compose o se usa localhost por defecto
const GAMEY_URL = process.env.GAMEY_SERVICE_URL || 'http://gamey:4000';

const normalizeIconName = (rawValue) => {
  const value = String(rawValue || '').trim();
  if (!value) return 'SinAvatar.png';
  const normalized = value.replaceAll('\\', '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1] || 'SinAvatar.png';
};

try {
  const swaggerDocument = YAML.load(fs.readFileSync('./openapi.yaml', 'utf8')); // Create the web page on http://localhost:3000/api-docs
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  console.log(e);
}

// CORS --> The server accepts requests from any origin (*)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  // MODIFICA ESTA LÍNEA PARA INCLUIR Authorization
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());




// --- ENDPOINTS (Controllers) ---


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
    if (Number.isNaN(birthDate.getTime())) {
      return res.status(400).json({ error: "birthDate is invalid" });
    }
    const existingNickname = await User.findOne({ nickname });
    if (existingNickname) {
      return res.status(409).json({ error: "Nickname already exists" });
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

    res.json({ 
      message: `Hello ${username}! Your account has been created!`,
      friendCode: `#${friendCode}`,
      nickname
    })

  } catch (err) {
    res.status(400).json({ error: "User already exists or database error" });
  }
});


// ACTION --> Log in with username and password
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {

    const loginValue = String(username || '').trim(); // Usuario o nickname.
    const user =
      (await User.findOne({ nickname: loginValue })) ||
      (await User.findOne({ username: loginValue }));

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
      res.json({
        message: `Welcome back, ${username}!`,
        token,//enviar el token a frontend
        username: user.username,
        nickname: user.nickname,
        language: user.language,
        score: user.score,
        iconName: user.iconName,
        friendCode: user.friendCode
      });
    } else {
      res.status(401).json({ error: "Usuario o contraseña incorrecta" });
    }
      
  } catch (err) {
    res.status(500).json({ error: "Error del servidor" });
  }
})

app.get('/users/search', async (req, res) => {
  const query = String(req.query.query || '').trim();
  
  try {
    let searchCriteria = {};

    // Si la búsqueda empieza por #, buscamos coincidencia exacta por friendCode
    if (query.startsWith('#')) {
      // Quitamos el # para buscar en la base de datos (donde se guarda como "ABC123")
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

app.post('/users/follow', async (req, res) => {
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
    res.status(500).json({ error: 'Error al enviar solicitud' });
  }
});

// En users-service.js (alrededor de la línea 170)
app.get('/users/profile/:username', async (req, res) => {
  const username = String(req.params.username || '').trim();

  try {
    const user = await User.findOne({ username });
    // Si decides usar populate, asegúrate de que el modelo esté bien definido,
    // si da error 500, comenta las líneas de populate.

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json({
      username: user.username,
      nickname: user.nickname,
      birthDate: user.birthDate,
      language: user.language,
      iconName: user.iconName,
      // Usamos el tamaño del array directamente si no vas a popular
      followingCount: user.following?.length || 0,
      followersCount: user.followers?.length || 0
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error del servidor: ' + err.message });
  }
}); 


app.patch('/users/profile/:username', async (req, res) => {
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
        return res.status(400).json({ error: 'Fecha de nacimiento invalida' });
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
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/users/profile/:username/change-password', async (req, res) => {
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
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

app.get('/friends', async (req, res) => {
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
    res.status(500).json({ error: 'Error fetching friends' });
  }
});

// Obtener solicitudes que me han enviado a mí (pendientes)
app.get('/friends/requests', async (req, res) => {
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
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
});

// Aceptar o Rechazar solicitud
app.post('/friends/respond', async (req, res) => {
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
    res.status(500).json({ error: 'Error al responder solicitud' });
  }
});

/**
 * Endpoint para obtener el perfil público de un usuario, incluyendo estadísticas de juego.
 */
app.get('/users/public-profile/:username', async (req, res) => {
  const targetUsername = String(req.params.username || '').trim();
  const requester = String(req.query.requester || '').trim(); // Usuario que hace la petición
  try {
    // Buscar los campos públicos del usuario
    const user = await User.findOne({ username: targetUsername })
      .select('username nickname iconName friendCode');

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Buscar relacion
    let relationship = 'none';
    if (requester === targetUsername) {
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
          totalGames: rustStats.total // Transformamos "total" en "totalGames"
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
    res.status(500).json({ error: 'Error del servidor' });
  }
})

/**
 * Endpoint para cancelar una solicitud de amistad pendiente
 */
app.post('/friends/cancel', async (req, res) => {
  const { follower, following } = req.body;
  try {
    // Buscamos la relación pendiente donde nosotros somos uno de los involucrados
    await Friendship.findOneAndDelete({
      users: { $all: [follower, following] },
      status: 'pending'
    });
    res.json({ message: 'Solicitud cancelada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al cancelar la solicitud' });
  }
});

// Executes a move in the game
app.post('/move', async (req, res) => {
  const { cellIndex, username} = req.body; // NEW: Recibir difficulty

  try {
    // 1. IntegraciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n: Llamada al servicio de Rust
    const rustResponse = await fetch(`${GAMEY_URL}/execute-move`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
         index: cellIndex,
         player: username,
      })
    });

    if (!rustResponse.ok) {
       const text = await rustResponse.text();
       console.error("Error desde Rust:", text);
       return res.status(500).send(text);
    }

    const newBoard = await rustResponse.json();
    
    // 3. Respuesta HTTP
    res.json({ 
      responseFromRust: newBoard.board,
      winner: newBoard.winner
    });
  }
  catch (e) {
    console.error(e);
    res.status(500).json({error: 'Error communicating with Rust server'});
  }
});

// NEW: Endpoint para registrar una rendiciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n (derrota)
app.post('/surrender', async (req, res) => {
  const { username, difficulty, boardSize } = req.body;

  try {
    // 1. IntegraciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n: Llamada al servicio de Rust (GameY)
    const rustResponse = await fetch(`${GAMEY_URL}/surrender`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player: username,       // Rust espera "player"
        difficulty: difficulty,
        board_size: boardSize   // Rust espera "board_size"
      })
    });

    // 2. Control de errores de la respuesta de Rust
    if (!rustResponse.ok) {
      const text = await rustResponse.text();
      console.error("Error desde Rust en surrender:", text);
      return res.status(rustResponse.status).send(text);
    }

    const data = await rustResponse.json();

    // 3. Respuesta al Frontend
    res.json({ 
      message: "RendiciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n registrada correctamente",
      details: data 
    });

  } catch (e) {
    console.error("Error de conexiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n con Rust en surrender:", e);
    res.status(500).json({ error: 'Error communicating with Rust server' });
  }
});


// Resets the game board WITHOUT affecting stats
app.post('/reset', async (req, res) => {
  // CORRECCIÓN: Añadimos username a la extracción del body
  const { size, difficulty, username } = req.body;

  try {
    const requestedSize = Number(size);
    const safeSize = Number.isFinite(requestedSize) && requestedSize >= 3 && requestedSize <= 20
        ? Math.floor(requestedSize)
        : 5;

    const rustResponse = await fetch(`${GAMEY_URL}/reset`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        size: safeSize,
        difficulty: difficulty,
        player: username //
      }),
    });

    if (!rustResponse.ok) {
      throw new Error(`Rust error: ${rustResponse.status}`);
    }

    const newBoard = await rustResponse.json();
    res.json({ responseFromRust: newBoard });
  } catch (e) {
    console.error("Fallo en reset:", e.message);
    res.status(500).json({ error: 'Error communicating with Rust server' });
  }
});

// New
// Get available difficulties
app.get('/difficulties', async (req, res) => {
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
app.get('/history', async (req, res) => {
  // 1. Extraemos TODOS los parÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡metros de la URL, incluido 'result'
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

    // 4. AHORA SÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â, ejecutamos el fetch pasÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ndole el string de la URL
    const rustResponse = await fetch(rustUrl);

    if (!rustResponse.ok) {
      console.error(`Error en Rust: ${rustResponse.status}`);
      return res.status(rustResponse.status).json({ error: "Rust history service error" });
    }
    
    const paginatedData = await rustResponse.json();
    
    // DEBUG: Mira tu terminal de Node para ver si llegan datos
    console.log(`Historial para ${username}: (Pag ${page}):`, paginatedData.data);

    // 5. Enviamos el array directo al Frontend
    res.json(paginatedData); 
    
  } catch (e) {
    console.error("Error de conexiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n con Rust:", e);
    res.status(500).json({ error: 'No se pudo conectar con el servicio de Rust' });
  }
});


if (require.main === module) {

  mongoose.connect(process.env.MONGODB_URI_USERS + (process.env.MONGODB_OPTIONS || ""))
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB', err));

  app.listen(port, () => {
    console.log(`User Service listening at http://localhost:${port}`)
  })
}

module.exports = app
