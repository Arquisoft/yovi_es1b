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

// Para guardar un friendCode
const { customAlphabet } = require('nanoid');
// Alfabeto sin letras confusas (evitamos O, 0, I, l)
const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const generateFriendCode = customAlphabet(alphabet, 6); // Genera algo como "K8S2NW"

// URL del servicio de Rust (GameY); se inyecta desde docker-compose o se usa localhost por defecto
const GAMEY_URL = process.env.GAMEY_SERVICE_URL || 'http://gamey:4000';

try {
  const swaggerDocument = YAML.load(fs.readFileSync('./openapi.yaml', 'utf8')); // Create the web page on http://localhost:3000/api-docs
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  console.log(e);
}

// CORS --> The server accepts requests from any origin (*)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());




// --- ENDPOINTS (Controllers) ---


// ACTION --> Someone sends a Name and we respond with a Welcome Message
app.post('/createuser', async (req, res) => {
  // para evitar inyecciones de codigo, convertimos a string lo que recibimos del cliente
  const username = String(req.body.username || "");
  const password = String(req.body.password || "");
  const age = Number(req.body.age);
  const birthDate = req.body.birthDate ? new Date(String(req.body.birthDate)) : null;
  const country = String(req.body.country || "");
  const icon = String(req.body.icon || "");
  try {
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
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
      age,
      birthDate: birthDate && !Number.isNaN(birthDate.getTime()) ? birthDate : undefined,
      country,
      icon
    })

    // Save the new user to the database
    await newUser.save();

    res.json({ 
      message: `Hello ${username}! Your account has been created!`,
      friendCode: `#${friendCode}`
    })

  } catch (err) {
    res.status(400).json({ error: "User already exists or database error" });
  }
});


// ACTION --> Log in with username and password
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {

    const secureUsername = String(username); // Para evitar inyecciones de codigo.
    const user = await User.findOne({ username: secureUsername });

    if (!user) {
      return res.status(401).json({ error: "Usuario o contraseña incorrecta" });
    }

    // comparar contraseñas
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      res.json({
        message: `Welcome back, ${username}!`,
        username: user.username,
        score: user.score,
        icon: user.icon,
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

app.get('/users/profile/:username', async (req, res) => {
  const username = String(req.params.username || '').trim();

  try {
    const user = await User.findOne({ username })
      .populate('following', 'username score icon')
      .populate('followers', 'username score icon');

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json({
      username: user.username,
      age: user.age,
      country: user.country,
      icon: user.icon,
      followingCount: user.following?.length || 0,
      followersCount: user.followers?.length || 0,
      following: user.following || [],
      followers: user.followers || []
    });
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


// New
// Executes a move in the game
app.post('/move', async (req, res) => {
  const { cellIndex, username} = req.body; // NEW: Recibir difficulty

  try {
    // 1. Integración: Llamada al servicio de Rust
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

// NEW: Endpoint para registrar una rendición (derrota)
app.post('/surrender', async (req, res) => {
  const { username, difficulty, boardSize } = req.body;

  try {
    // 1. Integración: Llamada al servicio de Rust (GameY)
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
      message: "Rendición registrada correctamente",
      details: data 
    });

  } catch (e) {
    console.error("Error de conexión con Rust en surrender:", e);
    res.status(500).json({ error: 'Error communicating with Rust server' });
  }
});


// Resets the game board WITHOUT affecting stats
app.post('/reset', async (req, res) => {
  const { size, difficulty } = req.body;

  try {
    const requestedSize = Number(size);
    const safeSize =
      Number.isFinite(requestedSize) && requestedSize >= 3 && requestedSize <= 20
        ? Math.floor(requestedSize)
        : 5;

    const rustResponse = await fetch(`${GAMEY_URL}/reset`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ size: safeSize, difficulty: difficulty }),
    });
    const newBoard = await rustResponse.json();
    res.json({ responseFromRust: newBoard});
  }
  catch (e) {
    res.status(500).json({error: 'Error communicating with Rust server'});
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

    // 4. AHORA SÍ, ejecutamos el fetch pasándole el string de la URL
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
    console.error("Error de conexión con Rust:", e);
    res.status(500).json({ error: 'No se pudo conectar con el servicio de Rust' });
  }
});


if (require.main === module) {

  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB', err));

  app.listen(port, () => {
    console.log(`User Service listening at http://localhost:${port}`)
  })
}

module.exports = app
