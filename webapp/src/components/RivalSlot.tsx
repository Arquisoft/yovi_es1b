import React from 'react';
import defaultAvatar from '../assets/icon/SinAvatar.png';
import { useTranslation } from 'react-i18next';

interface RivalSlotProps {
  gameMode?: 'bot' | 'multiplayer' | null;
  rivalName?: string | null;
  rivalIcon?: string | null;
  botName?: string;
  botIcon?: string | null;
  onInviteFriends?: () => void;
}

/**
 * Componente que representa la ranura del rival (derecha del tablero)
 * - En modo bot: Muestra el bot con su nombre e icono
 * - En modo multijugador sin rival: Muestra un ícono vacío con botón de invitación
 * - En modo multijugador con rival: Muestra el rival con su nombre e icono
 *
 * Sigue principios SOLID:
 * - Single Responsibility: Solo gestiona la presentación de la ranura del rival
 * - Open/Closed: Extensible para nuevos modos sin modificar
 */
export const RivalSlot: React.FC<RivalSlotProps> = ({
  gameMode = 'bot',
  rivalName,
  rivalIcon,
  botName,
  botIcon,
  onInviteFriends,
}) => {
  const { t } = useTranslation();

  const isBotMode = gameMode === 'bot';
  const isMultiplayerWithRival = gameMode === 'multiplayer' && rivalName;
  let displayIcon = defaultAvatar;
  let displayName = t('game.invite_friend');

  if (isBotMode) {
    displayIcon = botIcon?.trim() ? botIcon : defaultAvatar;
    displayName = botName || 'Bot Player';
  } else if (isMultiplayerWithRival) {
    displayIcon = rivalIcon?.trim() ? rivalIcon : defaultAvatar;
    displayName = rivalName;
  }

  return (
    <div className="player-slot player-slot-right" aria-label={t('game.bot_player_slot')}>
      <div className="player-info player-info-right">
        <div className="player-header-row player-header-row-right">
          <p className="player-label player-label-red">{displayName}</p>
          <div className="player-avatar-box">
            <img
              src={displayIcon}
              alt={`Avatar de ${displayName}`}
              className={`player-avatar-image ${!isMultiplayerWithRival && gameMode === 'multiplayer' ? 'avatar-empty' : ''}`}
            />
          </div>
        </div>

        {/* Mostrar botón de invitación solo en multijugador sin rival */}
        {gameMode === 'multiplayer' && !isMultiplayerWithRival && onInviteFriends && (
          <div className="rival-invite-container">
            <button
              type="button"
              className="invite-friend-button"
              onClick={onInviteFriends}
              title={t('game.invite_friends')}
              aria-label={t('game.invite_friends')}
            >
              <span className="invite-button-icon">+</span>
              <span className="invite-button-text">{t('game.invite_friends')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RivalSlot;

