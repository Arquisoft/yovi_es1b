import type { DifficultyChoice, SizeChoice } from '../../types/game';

interface SelectionModalsProps {
  currentScreen: string;
  difficultyChoice: DifficultyChoice | null;
  sizeChoice: SizeChoice | null;
  availableDifficulties: string[];
  onDifficultySelect: (diff: DifficultyChoice) => void;
  onSizeSelect: (size: SizeChoice) => void;
}

export const SelectionModals = ({
  currentScreen,
  difficultyChoice,
  sizeChoice,
  availableDifficulties,
  onDifficultySelect,
  onSizeSelect
}: SelectionModalsProps) => {
  
  if (currentScreen !== 'game') return null;

  // Modal de Dificultad
  if (difficultyChoice === null) {
    return (
      <div className="modal-backdrop">
        <div className="modal-box">
          <h3>¿Con qué dificultad quieres jugar?</h3>
          {availableDifficulties.map(diff => (
            <button key={diff} className="submit-button" onClick={() => onDifficultySelect(diff)}>
              {diff}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Modal de Tamaño
  if (sizeChoice === null) {
    return (
      <div className="modal-backdrop">
        <div className="modal-box">
          <h3>¿Con qué tamaño de tablero deseas jugar?</h3>
          {(['Tamaño 6x6x6', 'Tamaño 9x9x9', 'Tamaño 12x12x12'] as SizeChoice[]).map(size => (
            <button key={size} className="submit-button" onClick={() => onSizeSelect(size)}>
              {size}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
};