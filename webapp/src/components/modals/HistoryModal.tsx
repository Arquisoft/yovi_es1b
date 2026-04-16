import { useTranslation } from 'react-i18next';
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

  const { t } = useTranslation();
  if (!isOpen) return null; // Si no está abierto, no renderiza nada

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
          onClose();
        }
      }}
    >
      <div className="modal-box history-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{t('game.history_title')}</h3>

        {/* Selector de Filtro */}
        <div className="history-controls">
          <label htmlFor="result-filter">{t('game.filter_by_result')}: </label>
          <select 
            id="result-filter" 
            value={currentFilter || ''} 
            onChange={(e) => onFilterChange(e.target.value)}
            className="filter-select"
          >
            <option value="">{t('game.filter_all')}</option>
            <option value="Victoria">{t('game.filter_wins')}</option>
            <option value="Derrota">{t('game.filter_losses')}</option>
          </select>
        </div>

        {/* Tabla de Datos */}
        <div className="history-table-container">
          {data.length > 0 ? (
            <table className="history-table">
              <thead>
                <tr>
                  <th>{t('game.col_date')}</th>
                  <th>{t('game.col_rival')}</th>
                  <th>{t('game.col_size')}</th>
                  <th>{t('game.col_difficulty')}</th>
                  <th>{t('game.col_result')}</th>
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
            <p>{t('game.no_history')}</p>
          )}
        </div>

        {/* Paginación */}
        {data.length > 0 && (
          <div className="history-pagination">
            <button 
              className="submit-button"
              onClick={() => onPageChange(currentPage - 1)} 
              disabled={currentPage === 1}
            >{t('game.prev_page')}</button>
            <span className="history-pagination-info">
              {t('game.page_info', { current: currentPage, total: totalPages })}
            </span>
            <button 
              className="submit-button"
              onClick={() => onPageChange(currentPage + 1)} 
              disabled={currentPage === totalPages}
            >{t('game.next_page')}</button>
          </div>
        )}

        <button className="submit-button" onClick={onClose}>
          {t('game.back_to_game')}
        </button>
      </div>
    </div>
  );
};
