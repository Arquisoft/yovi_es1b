import { useEffect, useMemo, useState } from 'react';
import { gameService } from '../services/gameService';
import defaultAvatar from '../assets/icon/SinAvatar.png';

const languageModules = import.meta.glob('../assets/language/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

export const getLanguageIcon = (token: string): string | null => {
  const entry = Object.entries(languageModules).find(([path]) => path.toLowerCase().includes(token.toLowerCase()));
  return entry ? entry[1] : null;
};

export const getLanguageIconDisplayState = (icon: string | null) => ({
  src: icon || '',
  iconDisplay: icon ? 'block' : 'none',
  fallbackDisplay: icon ? 'none' : 'block',
});

type AvatarIcon = {
  id: string;
  src: string;
  name: string;
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

export const shouldShowNoIconsMessage = (icons: Array<{ id: string }>): boolean => icons.length === 0;

export const renderAvatarIconPicker = (
  icons: AvatarIcon[],
  avatarDraft: string,
  setAvatarDraft: (value: string) => void,
  noAvatar: AvatarIcon | undefined,
  male: AvatarIcon[],
  female: AvatarIcon[],
) => {
  if (shouldShowNoIconsMessage(icons)) {
    return <small className="error-message">Anade iconos en `webapp/src/assets/icon` para poder elegir uno.</small>;
  }

  return (
    <>
      {noAvatar && (
        <>
          <div className="icon-row-label">Sin Avatar</div>
          <div className="icon-row-grid icon-row-grid-single">
            <button
              type="button"
              className={`icon-option ${avatarDraft === noAvatar.name ? 'icon-option-selected' : ''}`}
              onClick={() => setAvatarDraft(noAvatar.name)}
              title="Sin Avatar"
              aria-label="Elegir Sin Avatar"
              aria-pressed={avatarDraft === noAvatar.name}
            >
              <img src={noAvatar.src} alt="Sin Avatar" className="icon-option-img" />
            </button>
          </div>
        </>
      )}

      <div className="icon-row-label">Hombre</div>
      <div className="icon-row-grid">
        {male.map((icon) => {
          const isSelected = avatarDraft === icon.name;
          return (
            <button
              key={icon.id}
              type="button"
              className={`icon-option ${isSelected ? 'icon-option-selected' : ''}`}
              onClick={() => setAvatarDraft(icon.name)}
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
        {female.map((icon) => {
          const isSelected = avatarDraft === icon.name;
          return (
            <button
              key={icon.id}
              type="button"
              className={`icon-option ${isSelected ? 'icon-option-selected' : ''}`}
              onClick={() => setAvatarDraft(icon.name)}
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
  );
};

const noAvatarIcon = availableIcons.find((icon) => icon.name.toLowerCase().includes('sinavatar'));
const maleIcons = availableIcons.filter((icon) => icon.name.toLowerCase().includes('hombre')).slice(0, 4);
const femaleIcons = availableIcons.filter((icon) => icon.name.toLowerCase().includes('mujer')).slice(0, 4);

export const findIconSrcByName = (iconName: string): string => {
  const match = availableIcons.find((icon) => icon.name === iconName);
  return match?.src || defaultAvatar;
};

interface ProfileScreenProps {
  isOpen: boolean;
  username: string;
  onClose: () => void;
  onIconUpdated?: (icon: string) => void;
}

export const ProfileScreen = ({ isOpen, username, onClose, onIconUpdated }: ProfileScreenProps) => {
  const [profileName, setProfileName] = useState(username);
  const [nickname, setNickname] = useState(() => localStorage.getItem('yovi_user_nickname') || '');
  const [birthDate, setBirthDate] = useState('');
  const [language, setLanguage] = useState(() => localStorage.getItem('yovi_user_language') || '');
  const [iconName, setIconName] = useState('SinAvatar.png');
  const [isLoading, setIsLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [avatarError, setAvatarError] = useState('');

  const [showPasswordEditor, setShowPasswordEditor] = useState(false);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [avatarDraft, setAvatarDraft] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const selectedIcon = findIconSrcByName(iconName);

  const formattedBirthDate = useMemo(() => {
    if (!birthDate) return '';
    return birthDate.slice(0, 10);
  }, [birthDate]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    const loadProfile = async () => {
      setIsLoading(true);
      setErrorMessage('');
      setInfoMessage('');
      try {
        const data = await gameService.getProfile();
        if (!active) return;
        if (data?.error) {
          setErrorMessage(data.error);
          return;
        }
        setProfileName(data.username || username);
        const resolvedNickname = data.nickname || data.username || '';
        setNickname(resolvedNickname);
        if (resolvedNickname) {
          localStorage.setItem('yovi_user_nickname', resolvedNickname);
        } else {
          localStorage.removeItem('yovi_user_nickname');
        }
        setBirthDate(data.birthDate ? String(data.birthDate).slice(0, 10) : '');
        const resolvedLanguage = data.language || '';
        setLanguage(resolvedLanguage);
        if (resolvedLanguage) {
          localStorage.setItem('yovi_user_language', resolvedLanguage);
        } else {
          localStorage.removeItem('yovi_user_language');
        }
        const resolvedIconName =
          typeof data.iconName === 'string'
            ? data.iconName
            : typeof data.icon === 'string'
              ? data.icon
              : 'SinAvatar.png';
        setIconName(resolvedIconName || 'SinAvatar.png');
      } catch (error) {
        if (active) setErrorMessage('No se pudo cargar el perfil.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadProfile();
    return () => {
      active = false;
    };
  }, [isOpen, username]);

  if (!isOpen) return null;

  const openAvatarEditor = () => {
    setErrorMessage('');
    setInfoMessage('');
    setAvatarError('');
    setShowPasswordEditor(false);
    setAvatarDraft('');
    setShowAvatarEditor(true);
  };

  const cancelAvatarEditor = () => {
    setAvatarDraft('');
    setAvatarError('');
    setShowAvatarEditor(false);
  };

  const applyAvatarSelection = () => {
    if (!avatarDraft) {
      setAvatarError('Debes elegir un avatar para continuar o cancelar.');
      return;
    }
    setIconName(avatarDraft);
    setInfoMessage('Avatar preparado. Pulsa "Guardar perfil" para confirmar cambios.');
    setErrorMessage('');
    setAvatarError('');
    setShowAvatarEditor(false);
  };

  const handleSaveProfile = async () => {
    setErrorMessage('');
    setInfoMessage('');
    setIsLoading(true);
    try {
      const data = await gameService.updateProfile( {
        birthDate: birthDate || null,
        language,
        nickname,
        iconName,
      });
      if (data?.error) {
        setErrorMessage(data.error);
      } else {
        setInfoMessage('Perfil actualizado correctamente.');
        if (language) {
          localStorage.setItem('yovi_user_language', language);
        } else {
          localStorage.removeItem('yovi_user_language');
        }
        if (nickname) {
          localStorage.setItem('yovi_user_nickname', nickname);
        } else {
          localStorage.removeItem('yovi_user_nickname');
        }
        if (onIconUpdated) onIconUpdated(iconName);
      }
    } catch (error) {
      setErrorMessage('No se pudo actualizar el perfil.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setErrorMessage('');
    setInfoMessage('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage('Completa los tres campos de Contraseña.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('La nueva Contraseña y su confirmacion no coinciden.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await gameService.changePassword(currentPassword, newPassword);
      if (data?.error) {
        setErrorMessage(data.error);
      } else {
        setInfoMessage('Contraseña actualizada correctamente.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordEditor(false);
      }
    } catch (error) {
      setErrorMessage('No se pudo actualizar la Contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Ver mi perfil">
      <div className="modal-box profile-modal">
        <h3 className="profile-title">Ver mi perfil</h3>

        {errorMessage && <small className="error-message">{errorMessage}</small>}
        {infoMessage && <small className="success-message">{infoMessage}</small>}

        <div className="profile-modal-layout">
          <div className="profile-left-pane">
            <img src={selectedIcon} alt="Avatar seleccionado" className="profile-main-avatar" />
            <div className="profile-left-caption">Avatar actual</div>
            <button type="button" className="submit-button profile-avatar-change-btn" onClick={openAvatarEditor}>
              Modificar avatar
            </button>
          </div>

          <div className="profile-right-pane">
            <div className="profile-form-grid">
              <div className="form-group">
                <label htmlFor="profile-name">Nombre</label>
                <input id="profile-name" className="form-input" type="text" value={profileName} disabled />
              </div>

            <div className="form-group">
              <label htmlFor="profile-nickname">Apodo</label>
              <input
                id="profile-nickname"
                className="form-input"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="profile-birthdate">Fecha de nacimiento</label>
              <input
                id="profile-birthdate"
                className="form-input"
                type="date"
                value={formattedBirthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Idioma</label>
              <div className="country-checkbox-box" role="group" aria-label="Seleccion de idioma">
                {countryOptions.map((option) => {
                  const checked = language === option.value;
                  const displayState = getLanguageIconDisplayState(option.icon);
                  return (
                    <label key={option.value} className="country-checkbox-item">
                      <span className="country-checkbox-left">
                        <img
                          src={displayState.src}
                          alt={option.value}
                          className="country-flag-icon"
                          style={{ display: displayState.iconDisplay }}
                        />
                        <span
                          className="country-flag-fallback"
                          aria-hidden="true"
                          style={{ display: displayState.fallbackDisplay }}
                        />
                        <span>{option.value}</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => setLanguage(e.target.checked ? option.value : '')}
                        aria-label={`Seleccionar ${option.value}`}
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="profile-password-section">
              <div className="form-group">
                <label htmlFor="profile-password">Contraseña</label>
                <div className="profile-password-row">
                  <input id="profile-password" className="form-input" type="password" value="********" disabled />
                  <button
                    type="button"
                    className="submit-button profile-password-toggle"
                    onClick={() => setShowPasswordEditor((prev) => !prev)}
                  >
                    {showPasswordEditor ? 'Cancelar cambio de Contraseña' : 'Cambiar Contraseña (verificacion)'}
                  </button>
                </div>
              </div>

              {showPasswordEditor && (
                <div className="profile-password-editor">
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Contraseña actual"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Nueva Contraseña"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Confirmar nueva Contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button type="button" className="submit-button" onClick={handleChangePassword} disabled={isLoading}>
                    Guardar nueva Contraseña
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="profile-modal-actions">
          <button type="button" className="submit-button" onClick={handleSaveProfile} disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar perfil'}
          </button>
          <button type="button" className="submit-button" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
      {showAvatarEditor && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Seleccionar avatar">
          <div className="modal-box profile-avatar-modal">
            <h3>Selecciona un avatar</h3>
            {avatarError && <small className="error-message">{avatarError}</small>}
            <div className="icon-picker-box" role="group" aria-label="Selector de iconos">
              {renderAvatarIconPicker(availableIcons, avatarDraft, setAvatarDraft, noAvatarIcon, maleIcons, femaleIcons)}
            </div>
            <div className="profile-avatar-editor-actions">
              <button type="button" className="submit-button" onClick={applyAvatarSelection}>
                Guardar avatar
              </button>
              <button type="button" className="submit-button" onClick={cancelAvatarEditor}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
