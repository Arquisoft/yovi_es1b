interface ResultModalProps {
  isOpen: boolean;
  winner: number | null;
  onClose: () => void;
}

export const ResultModal = ({ isOpen, winner, onClose }: ResultModalProps) => {
  if (!isOpen || winner === null) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Resultado de la partida">
      <div className="modal-box">
        <h3>{winner === 0 ? '¡Has ganado!' : 'Has perdido'}</h3>
        <div className="modal-actions">
          <button type="button" className="submit-button" onClick={onClose}>
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};