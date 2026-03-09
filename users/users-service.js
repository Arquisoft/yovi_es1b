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


// --- ENDPOINTS ---


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
  const { cellIndex, player } = req.body;

  try {
    const rustResponse = await fetch(`${GAMEY_URL}/execute-move`, { // LLama al endpoint de Rust para ejecutar el movimiento
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

    // Rust responde con { board, winner }; aquí lo adaptamos al formato que consume el front:
    // - responseFromRust: estado del tablero actualizado
    // - winner: ganador actual (null si la partida sigue)
    const newBoard = await rustResponse.json();
    res.json({ 
      responseFromRust: newBoard.board,
      winner: newBoard.winner
    });
  }
  catch (e) {
    res.status(500).json({error: 'Error communicating with Rust server'});
  }
});


// New
// Resets the game
app.post('/reset', async (req, res) => {

  const size = req.body.size || 5;
  const difficulty = req.body.difficulty; // NEW: Recibir dificultad opcional

  try {
    const requestedSize = Number(req.body?.size);
    // Normaliza y valida el tamaño solicitado por el cliente:
    // solo aceptamos enteros entre 3 y 20; si no, usamos 5 por defecto.
    const safeSize =
      Number.isFinite(requestedSize) && requestedSize >= 3 && requestedSize <= 20
        ? Math.floor(requestedSize)
        : 5;

    const rustResponse = await fetch(`${GAMEY_URL}/reset`, { // LLama al endpoint de Rust para resetear el juego
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ size: safeSize, difficulty: difficulty }), // NEW: Pasar dificultad a Rust
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
    const rustResponse = await fetch('http://gamey:4000/difficulties');
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
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: 'Username query parameter is required' });
    }

    // Usamos el nombre del servicio 'gamey' definido en Docker
    const rustResponse = await fetch(`${GAMEY_URL}/history?username=${username}`);

    if (!rustResponse.ok) {
      throw new Error('Rust history service failed');
    }

    const history = await rustResponse.json();
    res.json(history);
    
  } catch (e) {
    console.error("Error al pedir el historial a Rust:", e);
    res.status(500).json({ error: 'No se pudo obtener el historial' });
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
