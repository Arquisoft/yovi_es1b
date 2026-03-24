import type { HistoryGameRecord } from '../../types/game';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: HistoryGameRecord[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  // Opcional: si quieres mover el filtro aquí también
  currentFilter: string | null;
  onFilterChange: (filter: string) => void;
}

export const HistoryModal = ({ 
  isOpen, onClose, data, currentPage, totalPages, onPageChange, onFilterChange, currentFilter 
}: HistoryModalProps) => {
  
  if (!isOpen) return null; // Si no está abierto, no renderiza nada

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box history-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Historial de Partidas</h3>

        {/* Selector de Filtro */}
        <div className="history-controls">
          <label htmlFor="result-filter">Filtrar: </label>
          <select 
            id="result-filter" 
            value={currentFilter || ''} 
            onChange={(e) => onFilterChange(e.target.value)}
            className="filter-select"
          >
            <option value="">Todas</option>
            <option value="Victoria">Victorias</option>
            <option value="Derrota">Derrotas</option>
          </select>
        </div>

        {/* Tabla de Datos */}
        <div className="history-table-container">
          {data.length > 0 ? (
            <table className="history-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Rival</th>
                  <th>Tamaño</th>
                  <th>Dificultad</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {data.map((game, index) => (
                  <tr key={game._id?.$oid || index}>
                    <td>{new Date(game.date).toLocaleDateString()}</td>
                    <td>{game.opponent}</td>
                    <td>{game.board_size}x{game.board_size}</td>
                    <td>{game.difficulty}</td>
                    <td className={game.result === 'Victoria' ? 'text-win' : 'text-loss'}>
                      {game.result}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No hay partidas guardadas.</p>
          )}
        </div>

        {/* Paginación */}
        {data.length > 0 && (
          <div className="history-pagination">
            <button 
              className="submit-button"
              onClick={() => onPageChange(currentPage - 1)} 
              disabled={currentPage === 1}
            >Anterior</button>
            <span className="history-pagination-info">
              Página {currentPage} de {totalPages}
            </span>
            <button 
              className="submit-button"
              onClick={() => onPageChange(currentPage + 1)} 
              disabled={currentPage === totalPages}
            >Siguiente</button>
          </div>
        )}

        <button className="submit-button" onClick={onClose}>
          Volver al Juego
        </button>
      </div>
    </div>
  );
};