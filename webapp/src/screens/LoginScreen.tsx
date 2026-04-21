import { type FormEvent, useState } from 'react';
import { API_BASE_URL } from '../constants/config';
import logoGameY from '../assets/Logo_GameY.png';
import settingsImg from '../assets/buttons/configuracion.png';
import languageImg from '../assets/language/idioma.png';
import { SERVER_ERROR_MESSAGE, isServerOrDatabaseError } from '../utils/authErrors';
import { clearGuestSession } from '../utils/sessionUtils';

import { useTranslation } from 'react-i18next';

interface LoginData {
  username: string;
  password: string;
}

interface LoginResponse {
  token?: string;
  username?: string;
  friendCode: string;
  iconName?: string;
  icon?: string;
  nickname?: string;
  language?: string;
  error?: string;
}

interface LoginScreenProps {
  readonly onBack: () => void; // Vuelve a pantalla anterior
  readonly onOpenLanguage?: () => void;
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

const LOGIN_SERVER_ERROR_MESSAGE = `${SERVER_ERROR_MESSAGE} Error de conexión al iniciar sesión.`;

const getTrimmedCredentials = (username: string, password: string) => ({
  username: username.trim(),
  password: password.trim(),
});

const getProfileIcon = (data: LoginResponse) => {
  if (typeof data.iconName === 'string') {
    return data.iconName;
  }
  if (typeof data.icon === 'string') {
    return data.icon;
  }
  return null;
};

const persistLoginSession = (username: string, token?: string) => {
  if (token) {
    sessionStorage.setItem('token', token);
  }
  clearGuestSession();
  sessionStorage.setItem('username', username);
};

function LoginScreen({ onBack, onOpenLanguage, onOpenSettings, onOpenTutorial, onLogin }: Readonly<LoginScreenProps>) {
    const {t} = useTranslation()
    const [formData, setFormData] = useState<LoginData>({
      username: '',
      password: '',
    });
    const [formError, setFormError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false); // Para bloquear el formulario mientras se procesa el login

    const resolveLoginErrorMessage = (data: LoginResponse | null, status: number) =>
        isServerOrDatabaseError(data?.error, status)
            ? LOGIN_SERVER_ERROR_MESSAGE
            : data?.error || 'Error al iniciar sesión.';

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault(); // Evita recargar la pagina
      const {username, password} = getTrimmedCredentials(formData.username, formData.password);

      if (!username || !password) {
        setFormError(t('login.error_empty')); // Valida campos obligatorios
        return;
      }
      setFormError(null);
      setIsLoading(true);

      // Llamada al backend para validar usuario e iniciar el juego
      try {
        const response = await fetch(`${API_BASE_URL}/login`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            username,
            password,
          }),
        });

        const data = (await response.json()) as LoginResponse;

        if (response.ok) {
          const resolvedUsername = data.username || username;
          persistLoginSession(resolvedUsername, data.token);

          await onLogin(
              resolvedUsername,
              data.friendCode,
              getProfileIcon(data),
              typeof data.nickname === 'string' ? data.nickname : null,
              typeof data.language === 'string' ? data.language : null
          );
        } else {
          setFormError(resolveLoginErrorMessage(data, response.status));
        }
      } catch {
        setFormError(LOGIN_SERVER_ERROR_MESSAGE);
      } finally {
        setIsLoading(false);
      }
    };

    return (
        <div className="register-screen">
          <div className="auth-header auth-header-with-settings">
            <img src={logoGameY} alt="GameY" className="gamey-logo-large auth-logo-left"/>
            <h2 className="title-log login-title-highlight">
              {t('login.title')}
              <br/>
              {t('login.subtitle')}
            </h2>
            {(onOpenLanguage || onOpenSettings || onOpenTutorial) && (
                <div className="header-action-group">
                  {onOpenLanguage && (
                      <button
                          type="button"
                          className="header-settings-btn header-action-btn"
                          onClick={onOpenLanguage}
                          title={t('common.language')}
                          aria-label={t('common.language_aria')}
                      >
                        <img src={languageImg} alt="" className="floating-action-icon"/>
                      </button>
                  )}
                  {onOpenSettings && (
                      <button
                          type="button"
                          className="header-settings-btn header-action-btn"
                          onClick={onOpenSettings}
                          title={t('common.settings')}
                          aria-label={t('common.settings_aria')}
                      >
                        <img src={settingsImg} alt="" className="floating-action-icon"/>
                      </button>
                  )}
                  {onOpenTutorial && (
                      <button
                          type="button"
                          className="header-settings-btn header-action-btn"
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
          <form className="choose-option menu-content login-panel" onSubmit={handleSubmit}>
            {formError && <small className="error-message">{formError}</small>}

            <div className="form-group">
              <label htmlFor="login-username">{t('login.username')}</label>
              <input
                  id="login-username"
                  className="form-input"
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData((prev) => ({...prev, username: e.target.value}))}
                  required
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password">{t('login.password')}</label>
              <input
                  id="login-password"
                  className="form-input"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({...prev, password: e.target.value}))}
                  required
              />
            </div>

            <button type="submit" className="submit-button" disabled={isLoading}>
              {isLoading ? t('common.loading') : t('login.submit')}
            </button>
            <button type="button" className="submit-button cancel-button" onClick={onBack}> {/* No envia formulario */}
              {t('common.back')}
            </button>
          </form>
        </div>
    );
}
  export default LoginScreen;
