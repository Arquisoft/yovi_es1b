import { useState, useEffect } from 'react'
import './App.css'
import RegisterForm from './RegisterForm';
import reactLogo from './assets/react.svg'

// Defines how is the Rust object that we receive
interface GameYData {
  size: number;
  turn: number;
  players: string[];
  layout: string;
}


function App() {
  // New
  const [connectionStatus, setConnectionStatus] = useState("Without connection"); // State to see the servers response
  const [username, setUsername] = useState(''); // To save the username
  const [isGameStarted, setIsGameStarted] = useState(false); // To know the screen to show (register or game)
  const [boardData, setBoardData] = useState<GameYData | null>(null); // To save what Rust returns
  const [winner, setWinner] = useState<number | null>(null); // To save the winner (if any)


  const handleStart = async () => {
    if (username.trim() !== "") {
      setConnectionStatus("Iniciando nueva partida...");
      try {
        // Reset
        const response = await fetch('http://localhost:3000/reset', {   // Llama al endpoint de reset (/users) para iniciar una nueva partida
          method: 'POST',
        });

        const data = await response.json();

        if (data.responseFromRust) {
          setBoardData(data.responseFromRust);
          setWinner(null);
          setIsGameStarted(true);
          setConnectionStatus("Partida iniciada!");
        }
      }
      catch (error) {
        console.error("Error starting the game:", error);
        setIsGameStarted(true);
        setWinner(null);
      }
    }
  }

  // New: Function to handle cell clicks and send the move to Rust
  const handleCellClick = async (index: number) => {
    if (winner !== null) return; // There is a winner
    
    setConnectionStatus(`Moviendo a la posición ${index}...`);
    try {
      const response = await fetch(`http://localhost:3000/move`, { // Llama al endpoint de move (/users) para realizar un movimiento
        method: 'POST',
        headers: { 'Content-Type' : 'application/json' },
        body: JSON.stringify({ cellIndex: index, player: username})
      });

      const data = await response.json();

      if (data.responseFromRust) {
        setBoardData(data.responseFromRust);
        setWinner(data.winner);

        if (data.winner !== null) {
          setConnectionStatus(data.winner === 0 ? "¡Has ganado!" : "¡Ha ganado el bot!");
        }
        else {
          setConnectionStatus("Movimiento realizado!");
        }
        
      }
    }
    catch (error) {
      setConnectionStatus("Error realizando el movimiento");
    }
  }


  // VIEW
  return (
    <div className="App">
      {!isGameStarted ? (
        // SCREEN 1: Register 

        // Images
        <div className="register-screen">
          <a href="https://vitejs.dev" target="_blank" rel="noreferrer">
            <img src="/vite.svg" className="logo" alt="Vite logo" />
          </a>
          <a href="https://react.dev" target="_blank" rel="noreferrer">
            <img src={reactLogo} className="logo react" alt="React logo" />
          </a>
      
        <h2>Welcome to the Software Arquitecture 2025-2026 course</h2>
        <RegisterForm />

        {/* To try the game without registering, just for testing purposes. */}
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
          <div className="board-container">
            {boardData ? (() => {
              let globalIndex = 0; // Counter to know the global index of the cell
              return boardData?.layout.split('/').map((row, rowIndex) => (
                <div key={rowIndex} className="board-row">
                  {row.split('').map((cell, cellIndex) => {
                    const currentIndex = globalIndex++; // Assign and increment the global index
                    return (
                      <div
                        key={cellIndex}
                        className={`cell ${cell === 'B' ? 'blue' : cell === 'R' ? 'red' : 'empty'}`}
                        onClick={() => cell === '.' && handleCellClick(currentIndex)}  // Only allow clicking on empty cells
                      >
                        {cell !== '.' ? cell : ''}
                      </div>
                    );
                  })}
                </div>
              ));
            })() : <p>Carga el tablero para comenzar</p>}
          </div>
                    

          <div className="game-controls">
            <p className="status-text">{connectionStatus}</p>
            <button className="exit-button" onClick={() => setIsGameStarted(false)}>Salir</button>
          </div>

        </div>
      )}
    </div>
  );
}

export default App;
