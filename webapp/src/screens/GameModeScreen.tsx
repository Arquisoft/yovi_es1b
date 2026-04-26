import { useTranslation } from 'react-i18next';
import type { GameMode } from '../types/socketEvents';

type GameModeScreenProps = {
  onSelectMode: (mode: GameMode) => void;
  onLogout?: () => void;
};

export const GameModeScreen = ({ onSelectMode, onLogout }: GameModeScreenProps) => {
  const { t } = useTranslation();

  return (
    <dialog className="modal-backdrop" aria-label={t('mode.title')} open>
      <div className="modal-box">
        <h3>{t('mode.title')}</h3>
        <p>{t('mode.subtitle')}</p>
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
    </dialog>
  );
};
