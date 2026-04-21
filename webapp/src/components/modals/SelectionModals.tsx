import { SIZE_OPTIONS, type DifficultyChoice, type SizeChoice } from '../../types/game';
import { useTranslation } from 'react-i18next';
import { getDifficultyLabelKey, getSizeLabelKey } from '../../utils/gameLabelUtils';

interface SelectionModalsProps {
  currentScreen: string;
  difficultyChoice: DifficultyChoice | null;
  sizeChoice: SizeChoice | null;
  availableDifficulties: string[];
  onDifficultySelect: (diff: DifficultyChoice) => void;
  onSizeSelect: (size: SizeChoice) => void;
  onDifficultyCancel: () => void;
  onSizeCancel: () => void;
}

export const SelectionModals = ({
  currentScreen,
  difficultyChoice,
  sizeChoice,
  availableDifficulties,
  onDifficultySelect,
  onSizeSelect,
  onDifficultyCancel,
  onSizeCancel
}: SelectionModalsProps) => {
  const { t } = useTranslation();
  if (currentScreen !== 'game') return null;

  if (difficultyChoice === null) {
    return (
      <div className="modal-backdrop">
        <div className="modal-box">
          <h3>{t('game.select_difficulty')}</h3>
          {availableDifficulties.map((diff) => (
            <button key={diff} className="submit-button" onClick={() => onDifficultySelect(diff)}>
              {t(`game.${getDifficultyLabelKey(diff)}`)}
            </button>
          ))}
          <button type="button" className="submit-button" onClick={onDifficultyCancel}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    );
  }

  if (sizeChoice === null) {
    return (
      <div className="modal-backdrop">
        <div className="modal-box">
          <h3>{t('game.select_size')}</h3>
          {SIZE_OPTIONS.map((size) => (
            <button key={size} className="submit-button" onClick={() => onSizeSelect(size)}>
              {t(`game.${getSizeLabelKey(size)}`)}
            </button>
          ))}
          <button type="button" className="submit-button" onClick={onSizeCancel}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    );
  }

  return null;
};
