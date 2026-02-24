interface HomeScreenProps {
  username: string;
  onUsernameChange: (value: string) => void; // Actualiza el nick de Quick Access
  onStart: () => void; // Inicia una partida directa
  onGoToRegister: () => void; // Navega a pantalla de registro
  onGoToLogin: () => void; // Navega a pantalla de login
}

interface HomeActionsProps {
  onGoToRegister: () => void;
  onGoToLogin: () => void;
}

// Subcomponente para aislar las acciones de navegacion (registro/login)
function HomeActions({ onGoToRegister, onGoToLogin }: HomeActionsProps) {
  return (
    <div className="choose-option menu-content">
      <h3>Seleccione una forma de registro</h3>

      <button type="button" className="submit-button" onClick={onGoToRegister}>
        Registrarse
      </button>

      <button type="button" className="submit-button" onClick={onGoToLogin}>
        Iniciar sesion
      </button>
    </div>
  );
}

// Pantalla principal (home) con acceso a auth y quick access al juego
function HomeScreen({
  username,
  onUsernameChange,
  onStart,
  onGoToRegister,
  onGoToLogin,
}: HomeScreenProps) {
  return (
    <div className="home-screen">
      <h2 className="welcome-title">BIENVENIDO A 'Y'</h2>
      {/* Bloque con botones para ir a registro/login */}
      <HomeActions
        onGoToRegister={onGoToRegister}
        onGoToLogin={onGoToLogin}
      />

      {/* Acceso rapido para arrancar juego sin pasar por auth */}
      <div>
        <h3>Quick Access (Simulated Login)</h3>
        <input
          type="text"
          placeholder="Your nickname"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
        />
        <button onClick={onStart}>Start playing</button>
      </div>
    </div>
  );
}

export default HomeScreen;
