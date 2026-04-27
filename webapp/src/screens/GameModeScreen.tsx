import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import logoGameY from '../assets/Logo_GameY.png';
import settingsImg from '../assets/buttons/configuracion.png';
import languageImg from '../assets/language/idioma.png';
import defaultAvatar from '../assets/icon/SinAvatar.png';
import type { GameMode } from '../types/socketEvents';
import { ActionIconButton } from '../components/common/ActionIconButton';

type GameModeScreenProps = {
  onSelectMode: (mode: GameMode) => void;
  onLogout?: () => void;
  onOpenLanguage?: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenTutorial?: () => void;
};

type ActionButtonConfig = {
  key: string;
  onClick?: () => void;
  title: string;
  ariaLabel: string;
  content: ReactNode;
};

export const GameModeScreen = ({
  onSelectMode,
  onLogout,
  onOpenLanguage,
  onOpenProfile,
  onOpenSettings,
  onOpenTutorial,
}: GameModeScreenProps) => {
  const { t } = useTranslation();
  const allActionButtons: ActionButtonConfig[] = [
    {
      key: 'language',
      onClick: onOpenLanguage,
      title: t('common.language'),
      ariaLabel: t('common.language_aria'),
      content: <img src={languageImg} alt="" className="floating-action-icon" />,
    },
    {
      key: 'settings',
      onClick: onOpenSettings,
      title: t('common.settings'),
      ariaLabel: t('common.settings_aria'),
      content: <img src={settingsImg} alt="" className="floating-action-icon" />,
    },
    {
      key: 'tutorial',
      onClick: onOpenTutorial,
      title: t('common.help'),
      ariaLabel: t('common.help_aria'),
      content: <span className="help-icon-glyph" aria-hidden="true">?</span>,
    },
    {
      key: 'profile',
      onClick: onOpenProfile,
      title: t('game.profile'),
      ariaLabel: t('game.view_profile'),
      content: <img src={defaultAvatar} alt="" className="floating-action-icon profile-action-icon" />,
    },
  ];
  const actionButtons = allActionButtons.filter(
    (
      button
    ): button is ActionButtonConfig & { onClick: () => void } => typeof button.onClick === 'function'
  );

  return (
    <dialog className="modal-backdrop gamemode-backdrop" aria-label={t('mode.title')} open>
      <div className="mode-screen-stack">
        <div className="modal-box">
          <div className="mode-title-block">
            <img src={logoGameY} alt="GameY" className="mode-title-logo" />
            <div className="mode-title-copy">
              <h3>{t('mode.title')}</h3>
              <p>{t('mode.subtitle')}</p>
            </div>
          </div>
          {actionButtons.length > 0 && (
            <div className="mode-action-group">
              {actionButtons.map((button) => (
                <ActionIconButton
                  key={button.key}
                  className="header-settings-btn header-action-btn mode-action-btn"
                  onClick={button.onClick}
                  title={button.title}
                  ariaLabel={button.ariaLabel}
                >
                  {button.content}
                </ActionIconButton>
              ))}
            </div>
          )}
          <div className="mode-action-list">
            <button type="button" className="submit-button" onClick={() => onSelectMode('bot')}>
              {t('mode.bot_duel')}
            </button>
            <button type="button" className="submit-button" onClick={() => onSelectMode('multiplayer')}>
              {t('mode.multiplayer_duel')}
            </button>
            {onLogout && (
              <button type="button" className="submit-button mode-logout-button" onClick={onLogout}>
                {t('mode.logout')}
              </button>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
};
