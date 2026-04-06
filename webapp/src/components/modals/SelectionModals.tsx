import { SIZE_OPTIONS, type DifficultyChoice, type SizeChoice } from '../../types/game';

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
  if (currentScreen !== 'game') return null;

  if (difficultyChoice === null) {
    return (
      <div className="modal-backdrop">
        <div className="modal-box">
          <h3>¿Con qué dificultad quieres jugar?</h3>
          {availableDifficulties.map((diff) => (
            <button key={diff} className="submit-button" onClick={() => onDifficultySelect(diff)}>
              {diff}
            </button>
          ))}
          <button type="button" className="submit-button" onClick={onDifficultyCancel}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (sizeChoice === null) {
    return (
      <div className="modal-backdrop">
        <div className="modal-box">
          <h3>¿Con qué tamaño de tablero deseas jugar?</h3>
          {SIZE_OPTIONS.map((size) => (
            <button key={size} className="submit-button" onClick={() => onSizeSelect(size)}>
              {size}
            </button>
          ))}
          <button type="button" className="submit-button" onClick={onSizeCancel}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return null;
};
