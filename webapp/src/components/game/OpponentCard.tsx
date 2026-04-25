import React from 'react';
import defaultAvatar from '../../assets/icon/SinAvatar.png';
import { OpponentState, type OpponentCardProps } from '../../types/opponent';
import '../../css/Game.css';


/**
 * OpponentCard - Componente responsable de mostrar el estado del oponente
 * SOLID:
 * - Single Responsibility: Solo gestiona la visualización del oponente
 * - Open/Closed: Extensible para nuevos estados sin modificar el componente
 * - Dependency Inversion: Recibe callbacks en lugar de tener lógica de negocio
 */
export const OpponentCard: React.FC<OpponentCardProps> = ({
  state,
  opponentName,
  opponentIcon,
  onInviteFriend,
  isOpponentTurn = false,
}) => {
  const displayIcon = opponentIcon || defaultAvatar;
  const displayName = opponentName || 'Oponente';

  // Determinar clases y contenido según el estado
  const getStateContent = () => {
    switch (state) {
      case OpponentState.WAITING:
        return {
          className: 'opponent-card opponent-card--waiting',
          icon: null, // Mostrar placeholder vacío
          label: 'Sin oponente',
          showInviteButton: true,
        };

      case OpponentState.CONNECTING:
        return {
          className: 'opponent-card opponent-card--connecting',
          icon: displayIcon,
          label: `Conectando con ${displayName}...`,
          showInviteButton: false,
        };

      case OpponentState.CONNECTED:
        return {
          className: 'opponent-card opponent-card--connected',
          icon: displayIcon,
          label: displayName,
          showInviteButton: false,
        };

      case OpponentState.DISCONNECTED:
        return {
          className: 'opponent-card opponent-card--disconnected',
          icon: displayIcon,
          label: `${displayName} desconectado`,
          showInviteButton: true,
        };

      default:
        return {
          className: 'opponent-card',
          icon: null,
          label: 'Estado desconocido',
          showInviteButton: false,
        };
    }
  };

  const stateContent = getStateContent();

  return (
    <div className={stateContent.className}>
      {/* Avatar del oponente o placeholder vacío */}
      <div className="opponent-avatar-container">
        {stateContent.icon ? (
          <img
            src={stateContent.icon}
            alt={displayName}
            className={`opponent-avatar ${isOpponentTurn ? 'opponent-avatar--active' : ''}`}
          />
        ) : (
          <div className="opponent-placeholder">
            <span className="opponent-placeholder-icon">?</span>
          </div>
        )}

        {/* Indicador visual de turno activo */}
        {isOpponentTurn && state === OpponentState.CONNECTED && (
          <div className="opponent-turn-indicator" title="Turno del oponente">
            ⏱️
          </div>
        )}
      </div>

      {/* Nombre y estado */}
      <div className="opponent-info">
        <div className="opponent-name">{displayName}</div>
        <div className="opponent-status">{stateContent.label}</div>
      </div>

      {/* Botón de invitación (solo en estado WAITING) */}
      {stateContent.showInviteButton && (
        <button
          type="button"
          className="opponent-invite-btn"
          onClick={onInviteFriend}
          aria-label="Invitar amigos a jugar"
          title="Invitar amigos a jugar"
        >
          ➕
        </button>
      )}
    </div>
  );
};

export default OpponentCard;

