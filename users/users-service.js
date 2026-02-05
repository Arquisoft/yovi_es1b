// Node.js Server

const express = require('express');
const app = express();
const port = 3000;
const swaggerUi = require('swagger-ui-express');
const fs = require('node:fs');
const YAML = require('js-yaml');
const promBundle = require('express-prom-bundle');

const metricsMiddleware = promBundle({includeMethod: true});
app.use(metricsMiddleware);

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

// ACTION --> Someone sends a Name and we respond with a Welcome Message
app.post('/createuser', async (req, res) => {
  const username = req.body && req.body.username;
  try {
    // Simulate a 1 second delay to mimic processing/network latency
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const message = `Hello ${username}! welcome to the course!`;
    res.json({ message });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


app.get('/prueba-rust', async (req, res) => {
  try {
    // Node.js makes a request to the Rust server
    const response = await fetch('http://localhost:8080/prueba-rust');
    // If the Rust server responds, we send it to the web client
    const data = await response.json();
    res.json({
      message: "Node.js says hello",
      responseFromRust: data
    });
  } catch (error) {
    res.status(500).json({error: 'Error communicating with Rust server'});
  }
});


app.post('/move', async (req, res) => {
  const { cellIndex } = req.body;

  try {
    const rustResponse = await fetch('http://localhost:8080/execute-move', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ index: cellIndex})
    });

    if (!rustResponse.ok) {
       const text = await rustResponse.text();
       console.error("Error desde Rust:", text);
       return res.status(500).send(text);
    }

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


app.post('/reset', async (req, res) => {
  try {
    const rustResponse = await fetch('http://localhost:8080/reset', {
      method: 'POST',
    });
    const newBoard = await rustResponse.json();
    res.json({ responseFromRust: newBoard});
  }
  catch (e) {
    res.status(500).json({error: 'Error communicating with Rust server'});
  }
});


if (require.main === module) {

  app.listen(port, () => {
    console.log(`User Service listening at http://localhost:${port}`)
  })
}

module.exports = app
