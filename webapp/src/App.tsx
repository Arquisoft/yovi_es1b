import { useState } from 'react'
import './App.css'
import RegisterForm from './RegisterForm';
import reactLogo from './assets/react.svg'

function App() {
  // New
  const [connectionStatus, setConnectionStatus] = useState("Without connection"); // State to see the servers response
  const [username, setUsername] = useState(''); // To save the username
  const [isGameStarted, setIsGameStarted] = useState(false); // To know the screen to show (register or game)
  const [board, setBoard] = useState<number[] | null>(null); // To save what Rust returns

  const handleStart = () => {
    if (username.trim() !== "") {
      setIsGameStarted(true);
    }
  }

  // New: Function to call to the Node bridge
  const tryUnion = async () => {
    setConnectionStatus("Connecting...");
    try {
      const response = await fetch('http://localhost:3000/prueba-rust');
      const data = await response.json();

      console.log("Data from Node:", data);

      if (data.responseFromRust) {
        setBoard(data.responseFromRust); // Save Rust response in state
        setConnectionStatus("Board loaded!");
      } else {
        setConnectionStatus("Node responded, but no board data found.");
      }
    }catch (error) {
        console.error("Error fetching from Node:", error);
        setConnectionStatus("Error connecting to Node server");
      }
  };

  return (
    <div className="App">
      {!isGameStarted ? (
        // SCREEN 1: Register 
        <div className="register-screen">
          <a href="https://vitejs.dev" target="_blank" rel="noreferrer">
            <img src="/vite.svg" className="logo" alt="Vite logo" />
          </a>
          <a href="https://react.dev" target="_blank" rel="noreferrer">
            <img src={reactLogo} className="logo react" alt="React logo" />
          </a>
      
        <h2>Welcome to the Software Arquitecture 2025-2026 course</h2>
        <RegisterForm />

        <div>
          <h3>Quick Access (Simulated Login)</h3>
          <input
            type="text"
            placeholder="Your nickname"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button onClick={handleStart}>Start playing</button>
        </div>

      </div>
      
      ) : (
        // SCREEN 2: Game (just an example, you can change it)
        <div className="game-screen">

          <a href="https://vitejs.dev" target="_blank" rel="noreferrer">
            <img src="/vite.svg" className="logo" alt="Vite logo" />
          </a>
          <a href="https://react.dev" target="_blank" rel="noreferrer">
            <img src={reactLogo} className="logo react" alt="React logo" />
          </a>
      
          <h2>Jugador: {username}</h2>
          {/* CONTENEDOR DEL TABLERO */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 100px)', // 3 columnas de 100px
            gridTemplateRows: 'repeat(3, 100px)',    // 3 filas de 100px
            gap: '10px',                             // Espacio entre casillas
            justifyContent: 'center',
            margin: '20px auto',
            backgroundColor: '#444',                 // Color de fondo de las "grietas"
            padding: '10px',
            borderRadius: '8px',
            width: '320px'
          }}>
            {board && board.map((casilla, index) => (
              <div key={index} style={{
                backgroundColor: '#242424',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                fontWeight: 'bold',
                color: casilla === 1 ? '#646cff' : '#ff4646', // Azul para X, Rojo para O
                border: '1px solid #555',
                cursor: 'pointer'
              }}>
                {/* Dibujamos X si es 1, O si es 2, o nada si es 0 */}
                {casilla === 1 ? 'X' : casilla === 2 ? 'O' : ''}
              </div>
            ))}
          </div>

          <button onClick={tryUnion}>Actualizar desde Rust</button>
          <p>{connectionStatus}</p>
          <button onClick={() => setIsGameStarted(false)}>Salir</button>
        </div>
      )}
    </div>
  );
}

export default App;
