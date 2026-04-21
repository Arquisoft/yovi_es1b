import '../i18n.ts';
import logoGameY from '../assets/Logo_GameY.png';
import settingsImg from '../assets/buttons/configuracion.png';
import languageImg from '../assets/language/idioma.png';
import { useTranslation } from 'react-i18next'

interface HomeScreenProps {
  readonly username: string;
  readonly onUsernameChange: (value: string) => void; // Actualiza el nick de Quick Access
  readonly onStart: () => void; // Inicia una partida directa
  readonly onGoToRegister: () => void; // Navega a pantalla de registro
  readonly onGoToLogin: () => void; // Navega a pantalla de login
  readonly onOpenLanguage?: () => void;
  readonly onOpenSettings?: () => void;
  readonly onOpenTutorial?: () => void;
}

interface HomeActionsProps {
  readonly onStart: () => void;
  readonly onGoToRegister: () => void;
  readonly onGoToLogin: () => void;
}

// Subcomponente para aislar las acciones de acceso (invitado / registro / login)
function HomeActions({ onStart, onGoToRegister, onGoToLogin }: HomeActionsProps) {
    const { t } = useTranslation()
    return (
    <div className="choose-option menu-content">
      <h3>{t('home.select_register')}</h3>

      <button type="button" className="submit-button home-auth-button" onClick={onGoToLogin}>
          {t('home.login')}
      </button>

      <button type="button" className="submit-button home-auth-button" onClick={onGoToRegister}>
          {t('home.register')}
      </button>

      <button type="button" className="submit-button home-guest-button" onClick={onStart}>
          {t('home.guest')}
      </button>
    </div>
  );
}

// Pantalla principal (home) con acceso a auth y quick access al juego
function HomeScreen({
  onStart,
  onGoToRegister,
  onGoToLogin,
  onOpenLanguage,
  onOpenSettings,
  onOpenTutorial,
}: HomeScreenProps) {
    const { t } = useTranslation()
  return (
    <div className="home-screen">
      <h2 className="welcome-title">
        <span className="welcome-main">
          {t('home.welcome_main')}
        </span>
        <span className="welcome-kicker">{t('home.welcome_kicker')}</span>
      </h2>
      <img src={logoGameY} alt="GameY" className="gamey-logo-large" />
      {/* Bloque con botones para ir a registro/login */}
      <HomeActions
        onStart={onStart}
        onGoToRegister={onGoToRegister}
        onGoToLogin={onGoToLogin}
      />
      {(onOpenLanguage || onOpenSettings || onOpenTutorial) && (
        <div className="home-action-group">
          {onOpenLanguage && (
            <button
              type="button"
              className="home-settings-below home-action-btn"
              onClick={onOpenLanguage}
              title={t('common.language')}
              aria-label={t('common.language_aria')}
            >
              <img src={languageImg} alt="" className="floating-action-icon" />
            </button>
          )}
          {onOpenSettings && (
            <button
              type="button"
              className="home-settings-below home-action-btn"
              onClick={onOpenSettings}
              title={t('common.settings')}
              aria-label={t('common.settings_aria')}
            >
              <img src={settingsImg} alt="" className="floating-action-icon" />
            </button>
          )}
          {onOpenTutorial && (
            <button
              type="button"
              className="home-settings-below home-action-btn"
              onClick={onOpenTutorial}
              title={t('common.help')}
              aria-label={t('common.help_aria')}
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
