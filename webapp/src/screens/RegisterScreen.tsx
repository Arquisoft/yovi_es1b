import { type FormEvent, useState } from 'react';
import logoGameY from '../assets/Logo_GameY.png';
import settingsImg from '../assets/buttons/configuracion.png';

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

const SERVER_ERROR_MESSAGE = 'Error de los servidores, intentaremos solucionarlo lo antes posible. Error de red.';

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

function RegisterScreen({ onBack, onOpenSettings, onOpenTutorial, onCreateAccount }: Readonly<RegisterScreenProps>) {
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
      setFormError('Nombre, nickname, fecha de nacimiento, Contraseña y confirmacion no pueden estar en blanco.');
      return;
    }
    if (!formData.language.trim()) {
      setFormError('Debes seleccionar un idioma para continuar.');
      return;
    }
    setFormError(null);

    if (formData.password !== formData.confirmPassword) {
      setPasswordError('La confirmacion de Contraseña no coincide.');
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
            ? SERVER_ERROR_MESSAGE
            : data.error || 'Error al crear la cuenta.'
        );
      }
    } catch (error) {
      setFormError(SERVER_ERROR_MESSAGE);
    }
  };

  return (
    <div className="register-screen">
      <div className="auth-header auth-header-with-settings">
        <img src={logoGameY} alt="GameY" className="gamey-logo-large auth-logo-left" />
        <h2 className="title-log">ZONA DE REGISTRO</h2>
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
        {passwordError && <small className="error-message">{passwordError}</small>}

        <div className="register-form-layout">
          <div className="register-left-zone">
            <div className="form-group">
              <label htmlFor="register-name">Nombre</label>
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
              <label htmlFor="register-nickname">Apodo</label>
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
              <label htmlFor="register-birth-date">Fecha de nacimiento</label>
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
              <label htmlFor="register-password">Contraseña</label>
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
              <label htmlFor="register-confirm-password">Confirmar Contraseña</label>
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
              <label>Idioma</label>
              <div className="country-checkbox-box" role="group" aria-label="Seleccion de idioma">
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
              </div>
            </div>

            <div className="form-group">
              <label>Elige tu icono</label>
              <div className="icon-picker-box" role="group" aria-label="Selector de iconos">
                {shouldShowNoIconsMessage(availableIcons) ? (
                  <small className="error-message">Anade iconos en `webapp/src/assets/icon` para poder elegir uno.</small>
                ) : (
                  <>
                    {noAvatarIcon && (
                      <>
                        <div className="icon-row-label">Sin Avatar</div>
                        <div className="icon-row-grid icon-row-grid-single">
                          <button
                            type="button"
                            className={`icon-option ${selectedIconName === noAvatarIcon.name ? 'icon-option-selected' : ''}`}
                            onClick={() => setSelectedIconName(noAvatarIcon.name)}
                            title="Sin Avatar"
                            aria-label="Elegir Sin Avatar"
                            aria-pressed={selectedIconName === noAvatarIcon.name}
                          >
                            <img src={noAvatarIcon.src} alt="Sin Avatar" className="icon-option-img" />
                          </button>
                        </div>
                      </>
                    )}

                    <div className="icon-row-label">Hombre</div>
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

                    <div className="icon-row-label">Mujer</div>
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
              </div>
            </div>
          </div>
        </div>

        <div className="register-actions">
        <button type="submit" className="submit-button" disabled={!formData.language.trim()}>
          Crear cuenta
        </button>

          <button type="button" className="submit-button" onClick={onBack}>
            Volver
          </button>
        </div>
      </form>
    </div>
  );
}

export default RegisterScreen;


