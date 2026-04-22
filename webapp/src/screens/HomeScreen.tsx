import '../i18n.ts';
import logoGameY from '../assets/Logo_GameY.png';
import settingsImg from '../assets/buttons/configuracion.png';
import languageImg from '../assets/language/idioma.png';
import { useTranslation } from 'react-i18next'
import { ActionIconButton } from '../components/common/ActionIconButton';

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
  const { t } = useTranslation();
  const accessButtons = [
    { key: 'login', label: t('home.login'), onClick: onGoToLogin, className: 'submit-button home-auth-button' },
    { key: 'register', label: t('home.register'), onClick: onGoToRegister, className: 'submit-button home-auth-button' },
    { key: 'guest', label: t('home.guest'), onClick: onStart, className: 'submit-button home-guest-button' },
  ] as const;

  return (
    <div className="choose-option menu-content">
      <h3>{t('home.select_register')}</h3>

      {accessButtons.map((button) => (
        <button key={button.key} type="button" className={button.className} onClick={button.onClick}>
          {button.label}
        </button>
      ))}
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
  const { t } = useTranslation();
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
            <ActionIconButton
              className="header-settings-btn header-action-btn"
              onClick={onOpenLanguage}
              title={t('common.language')}
              ariaLabel={t('common.language_aria')}
            >
              <img src={languageImg} alt="" className="floating-action-icon" />
            </ActionIconButton>
          )}
          {onOpenSettings && (
            <ActionIconButton
              className="header-settings-btn header-action-btn"
              onClick={onOpenSettings}
              title={t('common.settings')}
              ariaLabel={t('common.settings_aria')}
            >
              <img src={settingsImg} alt="" className="floating-action-icon" />
            </ActionIconButton>
          )}
          {onOpenTutorial && (
            <ActionIconButton
              className="header-settings-btn header-action-btn"
              onClick={onOpenTutorial}
              title={t('common.help')}
              ariaLabel={t('common.help_aria')}
            >
              <span className="help-icon-glyph" aria-hidden="true">?</span>
            </ActionIconButton>
          )}
        </div>
      )}
    </div>
  );
}

export default HomeScreen;
