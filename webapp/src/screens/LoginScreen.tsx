import { type FormEvent, useState } from 'react';
import { API_BASE_URL } from '../constants/config';
import logoGameY from '../assets/Logo_GameY.png';
import settingsImg from '../assets/buttons/configuracion.png';

interface LoginData {
  username: string;
  password: string;
}

interface LoginScreenProps {
  readonly onBack: () => void; // Vuelve a pantalla anterior
  readonly onOpenSettings?: () => void;
  readonly onOpenTutorial?: () => void;
  readonly onLogin: (
    username: string,
    friendCode: string,
    icon?: string | null,
    nickname?: string | null,
    language?: string | null
  ) => Promise<void> | void; // Intenta iniciar partida con ese usuario
}

const SERVER_ERROR_MESSAGE = 'Error de los servidores, intentaremos solucionarlo lo antes posible. Error de conexión al iniciar sesión.';

const isServerOrDatabaseError = (error: string | undefined, status: number) => {
  if (status >= 500) return true;

  const normalized = (error || '').toLowerCase();
  return (
    normalized.includes('database') ||
    normalized.includes('base de datos') ||
    normalized.includes('server') ||
    normalized.includes('servidor') ||
    normalized.includes('connection') ||
    normalized.includes('conex')
  );
};

function LoginScreen({ onBack, onOpenSettings, onOpenTutorial, onLogin }: Readonly<LoginScreenProps>) {
  const [formData, setFormData] = useState<LoginData>({
    username: '',
    password: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Para bloquear el formulario mientras se procesa el login

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Evita recargar la pagina
    if (!formData.username.trim() || !formData.password.trim()) {
      setFormError('Usuario y contraseña no pueden estar en blanco.'); // Valida campos obligatorios
      return;
    }
    setFormError(null);
    setIsLoading(true);

    // Llamada al backend para validar usuario e iniciar el juego
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username.trim(),
          password: formData.password.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Guardamos el token para las cabeceras Authorization: Bearer <token>
        if (data.token) {
          sessionStorage.setItem('token', data.token);
        }
        // Guardamos el username para que getCurrentUser() funcione en gameService
        sessionStorage.setItem('username', data.username || formData.username.trim());

        await onLogin(
          data.username || formData.username.trim(),
          data.friendCode,
          typeof data.iconName === 'string' ? data.iconName : (typeof data.icon === 'string' ? data.icon : null),
          typeof data.nickname === 'string' ? data.nickname : null,
          typeof data.language === 'string' ? data.language : null
        );
      } else {
        setFormError(
          isServerOrDatabaseError(data.error, response.status)
            ? SERVER_ERROR_MESSAGE
            : data.error || 'Error al iniciar sesión.'
        );
      }
    } catch {
      setFormError(SERVER_ERROR_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-screen">
      <div className="auth-header auth-header-with-settings">
        <img src={logoGameY} alt="GameY" className="gamey-logo-large auth-logo-left" />
        <h2 className="title-log login-title-highlight">
          Bienvenido de vuelta a GameY
          <br />
          ¿Cómo era tu nombre?
        </h2>
        {(onOpenSettings || onOpenTutorial) && (
          <div className="header-action-group">
            {onOpenSettings && (
              <button
                type="button"
                className="header-settings-btn header-action-btn"
                onClick={onOpenSettings}
                title="Configuración"
                aria-label="Configuración de elementos de fondo"
              >
                <img src={settingsImg} alt="" className="floating-action-icon" />
              </button>
            )}
            {onOpenTutorial && (
              <button
                type="button"
                className="header-settings-btn header-action-btn"
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
      <form className="choose-option menu-content" onSubmit={handleSubmit}>
        {formError && <small className="error-message">{formError}</small>}

        <div className="form-group">
          <label htmlFor="login-username">Nombre de usuario</label>
          <input
            id="login-username"
            className="form-input"
            type="text"
            value={formData.username}
            onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="login-password">Contraseña</label>
          <input
            id="login-password"
            className="form-input"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
            required
          />
        </div>

        <button type="submit" className="submit-button" disabled={isLoading}>
          {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </button>
        <button type="button" className="submit-button" onClick={onBack}>
          Volver
        </button>
      </form>
    </div>
  );
}

export default LoginScreen;
