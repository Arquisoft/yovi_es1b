// Node.js Server

const mongoose = require('mongoose');
require('dotenv').config();

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
const GAMEY_URL = process.env.GAMEY_SERVICE_URL || 'http://localhost:4000';

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


// --- BUSINESS LOGIC LAYER (Services) ---

/**
 * Procesa el resultado de una partida y actualiza el historial del usuario.
 * Esta función encapsula la lógica de negocio, separándola del controlador HTTP.
 * 
 * @param {string} username - Nombre del usuario
 * @param {number|null} winnerId - ID del ganador (0: Humano, 1: Bot, null: Nadie)
 * @param {string} difficulty - Dificultad de la partida (opcional)
 */
async function processGameResult(username, winnerId, difficulty = 'Unknown') {
  if (winnerId === null || !username) return; // No hay nada que actualizar

  try {
    const user = await User.findOne({ username: String(username) });
    if (!user) {
      console.warn(`Intento de actualizar historial para usuario inexistente: ${username}`);
      return;
    }

    // Actualizar contadores globales
    user.gamesPlayed = (user.gamesPlayed || 0) + 1;

    // Determinar resultado
    let result = 'Draw';
    if (winnerId === 0) {
      result = 'Win';
      user.gamesWon = (user.gamesWon || 0) + 1;
    } else if (winnerId === 1) {
      result = 'Loss';
      user.gamesLost = (user.gamesLost || 0) + 1; // NEW: Sumar derrota
    }

    // Añadir al historial detallado
    user.gameHistory.push({
      date: new Date(),
      result: result,
      opponent: 'RandomBot', // En el futuro esto podría venir como parámetro
      difficulty: difficulty
    });

    await user.save();
    console.log(`Historial actualizado para ${username}: ${result} (Diff: ${difficulty})`);

  } catch (error) {
    console.error(`Error en processGameResult para ${username}:`, error);
    // No lanzamos el error para no interrumpir la respuesta HTTP al cliente,
    // pero lo registramos para monitoreo.
  }
}


// --- ENDPOINTS (Controllers) ---


// ACTION --> Someone sends a Name and we respond with a Welcome Message
app.post('/createuser', async (req, res) => {
  // para evitar inyecciones de codigo, convertimos a string lo que recibimos del cliente
  const username = String(req.body.username || "");
  const password = String(req.body.password || "");
  const age = Number(req.body.age);
  const country = String(req.body.country || "");
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
      country
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
        score: user.score
      });
    } else {
      res.status(401).json({ error: "Usuario o contraseña incorrecta" });
    }
      
  } catch (err) {
    res.status(500).json({ error: "Error del servidor" });
  }
})


// New
// Executes a move in the game
app.post('/move', async (req, res) => {
  const { cellIndex, username, difficulty } = req.body; // NEW: Recibir difficulty

  try {
    // 1. Integración: Llamada al servicio de Rust
    const rustResponse = await fetch(`${GAMEY_URL}/execute-move`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
         index: cellIndex,
         player: player
      })
    });

    if (!rustResponse.ok) {
       const text = await rustResponse.text();
       console.error("Error desde Rust:", text);
       return res.status(500).send(text);
    }

    const newBoard = await rustResponse.json();
    
    // 2. Lógica de Negocio: Delegamos la actualización del historial
    // Usamos 'await' si queremos asegurar que se guardó antes de responder,
    // o podemos quitarlo para hacerlo "fire-and-forget" y responder más rápido.
    // Aquí usamos await para consistencia.
    if (newBoard.winner !== null) {
        await processGameResult(username, newBoard.winner, difficulty); // NEW: Pasar difficulty
    }

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
    const { username, difficulty } = req.body;
    if (username) {
        // Llama a processGameResult con winnerId = 1 (Bot gana)
        await processGameResult(username, 1, difficulty);
        res.status(200).json({ message: 'Surrender recorded as a loss.' });
    } else {
        res.status(400).json({ error: 'Username is required to surrender.' });
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
  const username = req.query.username;
  
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {

    const user = await User.findOne({ username: String(username) });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Devolvemos el historial y las estadísticas
    res.json({
      gamesPlayed: user.gamesPlayed,
      gamesWon: user.gamesWon,
      gamesLost: user.gamesLost, // NEW: Devolver derrotas
      history: user.gameHistory
    });
    
  } catch (e) {
    console.error("Error al obtener el historial:", e);
    res.status(500).json({ error: 'Error interno del servidor' });
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
