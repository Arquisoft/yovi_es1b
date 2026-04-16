import { useTranslation } from 'react-i18next';

interface ResultModalProps {
  isOpen: boolean;
  winner: number | null;
  onClose: () => void;
}

export const ResultModal = ({ isOpen, winner, onClose }: ResultModalProps) => {
  const { t } = useTranslation();
  if (!isOpen || winner === null) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t('game.result_title')}>
      <div className="modal-box">
        <h3>{winner === 0 ? t('game.you_win') : t('game.you_lose')}</h3>
        <div className="modal-actions">
          <button type="button" className="submit-button" onClick={onClose}>
            {t('game.accept')}
          </button>
        </div>
      </div>
    </div>
  );
};