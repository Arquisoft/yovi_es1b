import { useTranslation } from 'react-i18next';
import type { DifficultyChoice, SizeChoice } from '../../types/game';

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

const SIZE_OPTIONS: SizeChoice[] = [
  'Tamaño 6x6x6',
  'Tamaño 9x9x9',
  'Tamaño 12x12x12',
];

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

  // Modal de Dificultad
  if (difficultyChoice === null) {
    return (
      <div className="modal-backdrop">
        <div className="modal-box">
          <h3>{t('game.select_difficulty')}</h3>
          {availableDifficulties.map((diff) => (
            <button key={diff} className="submit-button" onClick={() => onDifficultySelect(diff)}>
              {diff}
            </button>
          ))}
          <button type="button" className="submit-button" onClick={onDifficultyCancel}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    );
  }

  // Modal de Tamaño
  if (sizeChoice === null) {
    return (
      <div className="modal-backdrop">
        <div className="modal-box">
          <h3>{t('game.select_size')}</h3>
          {SIZE_OPTIONS.map((size) => (
            <button key={size} className="submit-button" onClick={() => onSizeSelect(size)}>
              {size}
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
