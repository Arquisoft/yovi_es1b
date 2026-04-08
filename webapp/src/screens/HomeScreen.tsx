import logoGameY from '../assets/Logo_GameY.png';
import { useTranslation } from 'react-i18next'

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
    const { t } = useTranslation()
    return (
    <div className="choose-option menu-content">
        <h3>{t('home.select_register')}</h3>

      <button type="button" className="submit-button" onClick={onGoToRegister}>
          {t('home.register')}
      </button>

      <button type="button" className="submit-button" onClick={onGoToLogin}>
          {t('home.login')}
      </button>
    </div>
  );
}

// Pantalla principal (home) con acceso a auth y quick access al juego
function HomeScreen({
  onGoToRegister,
  onGoToLogin,
}: HomeScreenProps) {
    const { t } = useTranslation()
  return (
    <div className="home-screen">
        <h2 className="welcome-title">{t('home.title')}'</h2>
        <img src={logoGameY} alt="GameY" className="gamey-logo-large" />
        {/* Bloque con botones para ir a registro/login */}
        <HomeActions
          onGoToRegister={onGoToRegister}
          onGoToLogin={onGoToLogin}
        />
    </div>
  );
}

export default HomeScreen;
