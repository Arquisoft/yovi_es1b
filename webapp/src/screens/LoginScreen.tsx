import { type FormEvent, useState } from 'react';
import { API_BASE_URL } from '../constants/config';
import logoGameY from '../assets/Logo_GameY.png';
import settingsImg from '../assets/buttons/configuracion.png';
import languageImg from '../assets/language/idioma.png';
import { SERVER_ERROR_MESSAGE, isServerOrDatabaseError } from '../utils/authErrors';
import { clearGuestSession } from '../utils/sessionUtils';
import { useTranslation } from 'react-i18next';

// --- Interfaces ---
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
    readonly onBack: () => void;
    readonly onRegister?: () => void;
    readonly onOpenLanguage?: () => void;
    readonly onOpenSettings?: () => void;
    readonly onOpenTutorial?: () => void;
    readonly onLogin: (
        username: string,
        friendCode: string,
        icon?: string | null,
        nickname?: string | null,
        language?: string | null
    ) => Promise<void> | void;
}

// --- Helpers ---
const LOGIN_SERVER_ERROR_MESSAGE = `${SERVER_ERROR_MESSAGE} Error de conexión al iniciar sesión.`;

const getTrimmedCredentials = (username: string, password: string) => ({
    username: username.trim(),
    password: password.trim(),
});

const getProfileIcon = (data: LoginResponse) => {
    return data.iconName || data.icon || null;
};

const getOptionalString = (value: unknown) => (typeof value === 'string' ? value : null);

/**
 * Persistencia unificada: Limpia invitados y guarda en localStorage/sessionStorage
 */
const persistLoginSession = (username: string, token?: string) => {
    clearGuestSession();
    // Usamos localStorage para el username por compatibilidad con gameService (visto en archivo 1)
    localStorage.setItem('username', username);
    sessionStorage.setItem('username', username);
    if (token) {
        sessionStorage.setItem('token', token);
    }
};

function LoginScreen({
                         onBack,
                         onRegister,
                         onOpenLanguage,
                         onOpenSettings,
                         onOpenTutorial,
                         onLogin
                     }: Readonly<LoginScreenProps>) {
    const { t } = useTranslation();
    const [formData, setFormData] = useState<LoginData>({
        username: '',
        password: '',
    });
    const [formError, setFormError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const resolveLoginErrorMessage = (data: LoginResponse | null, status: number) =>
        isServerOrDatabaseError(data?.error, status)
            ? LOGIN_SERVER_ERROR_MESSAGE
            : data?.error || 'Error al iniciar sesión.';

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const { username, password } = getTrimmedCredentials(formData.username, formData.password);

        if (!username || !password) {
            setFormError(t('login.error_empty'));
            return;
        }

        setFormError(null);
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                // IMPORTANTE: Mantenemos credentials para cookies del archivo 1
                credentials: 'include'
            });

            const data = (await response.json()) as LoginResponse;

            if (response.ok) {
                const resolvedUsername = data.username || username;
                persistLoginSession(resolvedUsername, data.token);

                await onLogin(
                    resolvedUsername,
                    data.friendCode,
                    getProfileIcon(data),
                    getOptionalString(data.nickname),
                    getOptionalString(data.language)
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

                <div className="header-action-group">
                    {onOpenLanguage && (
                        <button
                            type="button"
                            className="header-settings-btn header-action-btn"
                            onClick={onOpenLanguage}
                            title={t('common.language')}
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
                        >
                            <span className="help-icon-glyph" aria-hidden="true">?</span>
                        </button>
                    )}
                </div>
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
                        disabled={isLoading}
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
                        disabled={isLoading}
                        required
                    />
                </div>

                <button type="submit" className="submit-button" disabled={isLoading}>
                    {isLoading ? t('common.loading') : t('login.submit')}
                </button>

                <button type="button" className="submit-button cancel-button" onClick={onBack} disabled={isLoading}>
                    {t('common.back')}
                </button>

                {onRegister && (
                    <button
                        type="button"
                        className="login-register-link"
                        onClick={onRegister}
                        disabled={isLoading}
                    >
                        {t('login.register_link')}
                    </button>
                )}
            </form>
        </div>
    );
}

export default LoginScreen;
