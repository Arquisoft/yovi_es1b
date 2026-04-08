import logoGameY from '../assets/Logo_GameY.png';
import settingsImg from '../assets/buttons/configuracion.png';

interface HomeScreenProps {
  username: string;
  onUsernameChange: (value: string) => void; // Actualiza el nick de Quick Access
  onStart: () => void; // Inicia una partida directa
  onGoToRegister: () => void; // Navega a pantalla de registro
  onGoToLogin: () => void; // Navega a pantalla de login
  onOpenSettings?: () => void;
  onOpenTutorial?: () => void;
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
  onGoToRegister,
  onGoToLogin,
  onOpenSettings,
  onOpenTutorial,
}: HomeScreenProps) {
  return (
    <div className="home-screen">
      <h2 className="welcome-title">
        <span className="welcome-main">
          Bienvenido a <span className="welcome-brand">GameY</span>
        </span>
        <span className="welcome-kicker">La estrategia no tiene suerte</span>
      </h2>
      <img src={logoGameY} alt="GameY" className="gamey-logo-large" />
      {/* Bloque con botones para ir a registro/login */}
      <HomeActions
        onGoToRegister={onGoToRegister}
        onGoToLogin={onGoToLogin}
      />
      {(onOpenSettings || onOpenTutorial) && (
        <div className="home-action-group">
          {onOpenSettings && (
            <button
              type="button"
              className="home-settings-below home-action-btn"
              onClick={onOpenSettings}
              title="Configuracion"
              aria-label="Configuracion de elementos de fondo"
            >
              <img src={settingsImg} alt="" className="floating-action-icon" />
            </button>
          )}
          {onOpenTutorial && (
            <button
              type="button"
              className="home-settings-below home-action-btn"
              onClick={onOpenTutorial}
              title="Ayuda"
              aria-label="Abrir ayuda"
            >
              <span className="help-icon-glyph" aria-hidden="true">?</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default HomeScreen;
