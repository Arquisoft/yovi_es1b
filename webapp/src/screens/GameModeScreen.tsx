import { useTranslation } from 'react-i18next';
import type { GameMode } from '../types/socketEvents';

type GameModeScreenProps = {
  onSelectMode: (mode: GameMode) => void;
  onLogout?: () => void;
};

export const GameModeScreen = ({ onSelectMode, onLogout }: GameModeScreenProps) => {
  const { t } = useTranslation();

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t('mode.title')}>
      <div className="modal-box">
        <h3>{t('mode.title')}</h3>
        <p>{t('mode.subtitle')}</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <button type="button" className="submit-button" onClick={() => onSelectMode('bot')}>
            {t('mode.bot_duel')}
          </button>
          <button type="button" className="submit-button" onClick={() => onSelectMode('multiplayer')}>
            {t('mode.multiplayer_duel')}
          </button>
          {onLogout && (
            <button type="button" className="submit-button" style={{ backgroundColor: '#dc2626' }} onClick={onLogout}>
              {t('game.exit') || 'Cerrar sesión'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

