import { type FormEvent, useState } from 'react';
import logoGameY from '../assets/Logo_GameY.png';
import settingsImg from '../assets/buttons/configuracion.png';
import { SERVER_ERROR_MESSAGE, isServerOrDatabaseError } from '../utils/authErrors';
import { clearGuestSession } from '../utils/sessionUtils';
import {useTranslation} from "react-i18next";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const languageModules = import.meta.glob('../assets/language/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

export const getLanguageIcon = (token: string): string | null => {
  const entry = Object.entries(languageModules).find(([path]) => path.toLowerCase().includes(token.toLowerCase()));
  return entry ? entry[1] : null;
};

const countryOptions = [
  { value: 'Spain', icon: getLanguageIcon('espana') },
  { value: 'English', icon: getLanguageIcon('reino-unido') },
  { value: 'German', icon: getLanguageIcon('alemania') },
  { value: 'Portuguese', icon: getLanguageIcon('portugal') },
];

const iconModules = import.meta.glob('../assets/icon/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const availableIcons = Object.entries(iconModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, src], index) => {
    const fileName = path.substring(path.lastIndexOf('/') + 1);
    return {
      id: `${index}-${fileName}`,
      src,
      name: fileName,
    };
  });

const noAvatarIcon = availableIcons.find((icon) => icon.name.toLowerCase().includes('sinavatar'));
const maleIcons = availableIcons.filter((icon) => icon.name.toLowerCase().includes('hombre')).slice(0, 4);
const femaleIcons = availableIcons.filter((icon) => icon.name.toLowerCase().includes('mujer')).slice(0, 4);

export const shouldShowNoIconsMessage = (icons: Array<{ id: string }>): boolean => icons.length === 0;

interface RegisterData {
  name: string;
  nickname: string;
  birthDate: string;
  language: string;
  password: string;
  confirmPassword: string;
}

interface RegisterScreenProps {
  readonly onBack: () => void;
  readonly onOpenSettings?: () => void;
  readonly onOpenTutorial?: () => void;
  readonly onCreateAccount: (
    name: string,
    friendCode: string,
    icon?: string | null,
    language?: string | null,
    nickname?: string | null
  ) => Promise<void> | void;
}

const REGISTER_SERVER_ERROR_MESSAGE = `${SERVER_ERROR_MESSAGE} Error de red.`;

function RegisterScreen({ onBack, onOpenSettings, onOpenTutorial, onCreateAccount }: Readonly<RegisterScreenProps>) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<RegisterData>({
    name: '',
    nickname: '',
    birthDate: '',
    language: '',
    password: '',
    confirmPassword: '',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [selectedIconName, setSelectedIconName] = useState<string>('SinAvatar.png');

  const handleChange = (field: keyof RegisterData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.name.trim() || !formData.nickname.trim() || !formData.password.trim() || !formData.confirmPassword.trim() || !formData.birthDate) {
      setFormError(t('register.error_empty'));
      return;
    }
    if (!formData.language.trim()) {
      setFormError(t('register.error_no_language'));
      return;
    }
    setFormError(null);

    if (formData.password !== formData.confirmPassword) {
      setPasswordError(t('register.error_password_mismatch'));
      return;
    }
    setPasswordError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/createuser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.name.trim(),
          nickname: formData.nickname.trim(),
          password: formData.password.trim(),
          birthDate: formData.birthDate,
          language: formData.language.trim(),
          iconName: selectedIconName,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        clearGuestSession();
        await onCreateAccount(
          formData.name.trim(),
          data.friendCode,
          selectedIconName,
          formData.language.trim(),
          formData.nickname.trim()
        );
      } else {
        setFormError(
          isServerOrDatabaseError(data.error, response.status)
            ? REGISTER_SERVER_ERROR_MESSAGE
            : data.error || 'Error al crear la cuenta.'
        );
      }
    } catch {
      setFormError(REGISTER_SERVER_ERROR_MESSAGE);
    }
  };

  return (
    <div className="register-screen">
      <div className="auth-header auth-header-with-settings">
        <img src={logoGameY} alt="GameY" className="gamey-logo-large auth-logo-left" />
        <h2 className="title-log">{t('register.title')}</h2>
        {(onOpenSettings || onOpenTutorial) && (
          <div className="header-action-group">
            {onOpenSettings && (
              <button
                type="button"
                className="header-settings-btn header-action-btn"
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

      <form className="choose-option menu-content" onSubmit={handleSubmit}>
        {formError && <small className="error-message">{formError}</small>}
        {passwordError && <small className="error-message">{passwordError}</small>}

        <div className="register-form-layout">
          <div className="register-left-zone">
            <div className="form-group">
              <label htmlFor="register-name">{t('register.name')}</label>
              <input
                id="register-name"
                className="form-input"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="register-nickname">{t('register.nickname')}</label>
              <input
                id="register-nickname"
                className="form-input"
                type="text"
                value={formData.nickname}
                onChange={(e) => handleChange('nickname', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="register-birth-date">{t('register.birth_date')}</label>
              <input
                id="register-birth-date"
                className="form-input"
                type="date"
                value={formData.birthDate}
                onChange={(e) => handleChange('birthDate', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="register-password">{t('register.password')}</label>
              <input
                id="register-password"
                className="form-input"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="register-confirm-password">{t('register.confirm_password')}</label>
              <input
                id="register-confirm-password"
                className="form-input"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="register-right-zone">
            <div className="form-group">
              <fieldset className="country-checkbox-box">
                <legend>{t('register.language')}</legend>
                {countryOptions.map((option) => {
                  const checked = formData.language === option.value;
                  return (
                    <label key={option.value} className="country-checkbox-item">
                      <span className="country-checkbox-left">
                        {option.icon ? (
                          <img src={option.icon} alt={option.value} className="country-flag-icon" />
                        ) : (
                          <span className="country-flag-fallback" aria-hidden="true" />
                        )}
                        <span>{option.value}</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => handleChange('language', e.target.checked ? option.value : '')}
                        aria-label={`Seleccionar ${option.value}`}
                      />
                    </label>
                  );
                })}
              </fieldset>
            </div>

            <div className="form-group">
              <fieldset className="icon-picker-box">
                <legend>{t('register.choose_icon')}</legend>
                {shouldShowNoIconsMessage(availableIcons) ? (
                  <small className="error-message">{t('register.no_icons')}</small>
                ) : (
                  <>
                    {noAvatarIcon && (
                      <>
                        <div className="icon-row-label">{t('register.no_avatar')}</div>
                        <div className="icon-row-grid icon-row-grid-single">
                          <button
                            type="button"
                            className={`icon-option ${selectedIconName === noAvatarIcon.name ? 'icon-option-selected' : ''}`}
                            onClick={() => setSelectedIconName(noAvatarIcon.name)}
                            title={t('register.no_avatar')}
                            aria-label="Elegir Sin Avatar"
                            aria-pressed={selectedIconName === noAvatarIcon.name}
                          >
                            <img src={noAvatarIcon.src} alt={t('register.no_avatar')} className="icon-option-img" />
                          </button>
                        </div>
                      </>
                    )}

                    <div className="icon-row-label">{t('register.male')}</div>
                    <div className="icon-row-grid">
                      {maleIcons.map((icon) => {
                        const isSelected = selectedIconName === icon.name;
                        return (
                          <button
                            key={icon.id}
                            type="button"
                            className={`icon-option ${isSelected ? 'icon-option-selected' : ''}`}
                            onClick={() => setSelectedIconName(icon.name)}
                            title={icon.name}
                            aria-label={`Elegir ${icon.name}`}
                            aria-pressed={isSelected}
                          >
                            <img src={icon.src} alt={icon.name} className="icon-option-img" />
                          </button>
                        );
                      })}
                    </div>

                    <div className="icon-row-label">{t('register.female')}</div>
                    <div className="icon-row-grid">
                      {femaleIcons.map((icon) => {
                        const isSelected = selectedIconName === icon.name;
                        return (
                          <button
                            key={icon.id}
                            type="button"
                            className={`icon-option ${isSelected ? 'icon-option-selected' : ''}`}
                            onClick={() => setSelectedIconName(icon.name)}
                            title={icon.name}
                            aria-label={`Elegir ${icon.name}`}
                            aria-pressed={isSelected}
                          >
                            <img src={icon.src} alt={icon.name} className="icon-option-img" />
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </fieldset>
            </div>
          </div>
        </div>

        <div className="register-actions">
        <button type="submit" className="submit-button" disabled={!formData.language.trim()}>
          {t('register.submit')}
        </button>

          <button type="button" className="submit-button cancel-button" onClick={onBack}>
            {t('common.back')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default RegisterScreen;