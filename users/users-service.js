// Node.js Server

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('./models/user');

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
    
    // Encriptar
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = new User ({
      username,
      password: hashedPassword,
      age,
      birthDate: birthDate && !Number.isNaN(birthDate.getTime()) ? birthDate : undefined,
      country,
      icon
    })

    // Save the new user to the database
    await newUser.save();

    res.json({ message: `Hello ${username}! Your account has been created!`
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
        icon: user.icon
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
    const users = await User.find({
      username: { $regex: query, $options: 'i' }
    }).select('username score icon');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/users/follow', async (req, res) => {
  const follower = String(req.body.follower || '').trim();
  const following = String(req.body.following || '').trim();

  if (!follower || !following) {
    return res.status(400).json({ error: 'Follower y following son obligatorios' });
  }

  try {
    const targetUser = await User.findOne({ username: following });
    const me = await User.findOne({ username: follower });

    if (!targetUser || !me) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const targetId = targetUser._id;
    const currentFollowing = me.following || [];
    const alreadyFollowing =
      typeof currentFollowing.includes === 'function'
        ? currentFollowing.includes(targetId)
        : false;

    if (!alreadyFollowing) {
      if (typeof currentFollowing.push === 'function') {
        currentFollowing.push(targetId);
      }
      const currentFollowers = targetUser.followers || [];
      if (typeof currentFollowers.push === 'function') {
        currentFollowers.push(me._id);
      }
      await me.save();
      await targetUser.save();
    }

    return res.json({ message: `Ahora sigues a ${targetUser.username}` });
  } catch (err) {
    return res.status(500).json({ error: 'Error del servidor' });
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

    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: 'Error del servidor' });
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
