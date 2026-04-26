import { useEffect, useMemo, useState } from 'react';
import { gameService } from '../services/gameService';
import defaultAvatar from '../assets/icon/SinAvatar.png';
import i18n from '../i18n';
import { useTranslation } from 'react-i18next';
import { languageOptions } from '../utils/languageUtils';
import { ModalDialog } from '../components/common/ModalDialog';

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

function getLanguageToken(value: string) {
  switch (value) {
    case 'Spain':
      return 'espana';
    case 'English':
      return 'reino-unido';
    case 'German':
      return 'alemania';
    default:
      return 'portugal';
  }
}

const countryOptions = languageOptions.map((option) => ({
  ...option,
  icon: option.icon || getLanguageIcon(getLanguageToken(option.value)),
}));

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

const renderIconGrid = (
  icons: AvatarIcon[],
  avatarDraft: string,
  setAvatarDraft: (value: string) => void,
) => (
  <div className="icon-row-grid">
    {icons.map((icon) => {
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
);

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
      {renderIconGrid(male, avatarDraft, setAvatarDraft)}

      <div className="icon-row-label">Mujer</div>
      {renderIconGrid(female, avatarDraft, setAvatarDraft)}
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
  const { t } = useTranslation()
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
        const resolvedIconName = (() => {
          if (typeof data.iconName === 'string' && data.iconName) return data.iconName;
          if (typeof data.icon === 'string' && data.icon) return data.icon;
          return 'SinAvatar.png';
        })();
        setIconName(resolvedIconName || 'SinAvatar.png');
      } catch (error) {
        if (active) setErrorMessage(t('profile.error_load'));
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
      setAvatarError(t('profile.error_no_avatar'));
      return;
    }
    setIconName(avatarDraft);
    setInfoMessage(t('profile.avatar_ready'));
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
      const languageToI18n: Record<string, string> = {
        'Spain': 'es',
        'English': 'en',
        'German': 'de',
        'Portuguese': 'pt',
      }
      if (data?.error) {
        setErrorMessage(data.error);
      } else {
        setInfoMessage(t('profile.success_save'));
        if (language) {
          i18n.changeLanguage(languageToI18n[language] ?? 'es')
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
      setErrorMessage(t('profile.error_save'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setErrorMessage('');
    setInfoMessage('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage(t('profile.error_empty_password'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage(t('profile.error_password_mismatch'));
      return;
    }

    setIsLoading(true);
    try {
      const data = await gameService.changePassword(currentPassword, newPassword);
      if (data?.error) {
        setErrorMessage(data.error);
      } else {
        setInfoMessage(t('profile.success_password'));
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordEditor(false);
      }
    } catch (error) {
      setErrorMessage(t('profile.error_password'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalDialog className="modal-backdrop profile-modal-backdrop" ariaLabel="Ver mi perfil">
      <div className="modal-box profile-modal">
        <h3 className="profile-title">{t('profile.title')}</h3>

        {errorMessage && <small className="error-message">{errorMessage}</small>}
        {infoMessage && <small className="success-message">{infoMessage}</small>}

        <div className="profile-modal-layout">
          <div className="profile-left-pane">
            <img src={selectedIcon} alt="Avatar seleccionado" className="profile-main-avatar" />
            <div className="profile-left-caption">{t('profile.current_avatar')}</div>
            <button type="button" className="submit-button profile-avatar-change-btn" onClick={openAvatarEditor}>
              {t('profile.change_avatar')}
            </button>
          </div>

          <div className="profile-right-pane">
            <div className="profile-form-grid">
              <div className="form-group">
                <label htmlFor="profile-name">{t('profile.name')}</label>
                <input id="profile-name" className="form-input" type="text" value={profileName} disabled />
              </div>

            <div className="form-group">
              <label htmlFor="profile-nickname">{t('profile.nickname')}</label>
              <input
                id="profile-nickname"
                className="form-input"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={15}
              />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="profile-birthdate">{t('profile.birth_date')}</label>
              <input
                id="profile-birthdate"
                className="form-input"
                type="date"
                value={formattedBirthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>{t('profile.language')}</label>
              <div className="country-checkbox-box" role="group" aria-label="Seleccion de idioma">
                {countryOptions.map((option) => {
                  const checked = language === option.value;
                  return (
                    <label key={option.value} className="country-checkbox-item">
                      <span className="country-checkbox-left">
                        {option.icon ? (
                          <img
                            src={option.icon}
                            alt={t(option.labelKey)}
                            className="country-flag-icon"
                          />
                        ) : (
                          <span className="country-flag-fallback" aria-hidden="true" />
                        )}
                        <span>{t(option.labelKey)}</span>
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
                <label htmlFor="profile-password">{t('profile.password')}</label>
                <div className="profile-password-row">
                  <input id="profile-password" className="form-input" type="password" value="********" disabled />
                  <button
                    type="button"
                    className="submit-button profile-password-toggle"
                    onClick={() => setShowPasswordEditor((prev) => !prev)}
                  >
                    {showPasswordEditor ? t('profile.cancel_password') : t('profile.change_password')}
                  </button>
                </div>
              </div>

              {showPasswordEditor && (
                <div className="profile-password-editor">
                  <input
                    className="form-input"
                    type="password"
                    placeholder={t('profile.current_password')}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <input
                    className="form-input"
                    type="password"
                    placeholder={t('profile.new_password')}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <input
                    className="form-input"
                    type="password"
                    placeholder={t('profile.confirm_new_password')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button type="button" className="submit-button" onClick={handleChangePassword} disabled={isLoading}>
                    {t('profile.save_password')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="profile-modal-actions">
          <button type="button" className="submit-button" onClick={handleSaveProfile} disabled={isLoading}>
            {isLoading ? t('common.saving') : t('profile.save_profile')}
          </button>
          <button type="button" className="submit-button" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
      {showAvatarEditor && (
        <ModalDialog className="modal-backdrop" ariaLabel="Seleccionar avatar">
          <div className="modal-box profile-avatar-modal">
            <h3>{t('profile.select_avatar')}</h3>
            {avatarError && <small className="error-message">{avatarError}</small>}
            <div className="icon-picker-box" role="group" aria-label="Selector de iconos">
              {renderAvatarIconPicker(availableIcons, avatarDraft, setAvatarDraft, noAvatarIcon, maleIcons, femaleIcons)}
            </div>
            <div className="profile-avatar-editor-actions">
              <button type="button" className="submit-button" onClick={applyAvatarSelection}>
                {t('profile.save_avatar')}
              </button>
              <button type="button" className="submit-button" onClick={cancelAvatarEditor}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </ModalDialog>
      )}
    </ModalDialog>
  );
};
