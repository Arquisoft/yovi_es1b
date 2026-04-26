import { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { gameService, type Friend as SocialFriend, type FriendRequest as SocialFriendRequest } from '../../services/gameService';

import '../../i18n';
import { useTranslation } from 'react-i18next';

// --- INTERFACES DE DATOS ---
interface FriendsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  displayName: string;
  friendCode: string;
  icon?: string | null;
  onTriggerPublicProfile: (username: string) => void;
  onInviteFriend?: (friendUsername: string) => void;
  inviteLoadingUser?: string | null;
}

export const FriendsPanel = ({ isOpen, onClose, username, displayName, friendCode, icon, onTriggerPublicProfile, onInviteFriend, inviteLoadingUser }: FriendsPanelProps) => {
  const { t } = useTranslation();
  const [friends, setFriends] = useState<SocialFriend[]>([]);
  const [requests, setRequests] = useState<SocialFriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [showRequests, setShowRequests] = useState(false);

  // --- 1. FUNCIÓN DE CARGA CENTRALIZADA ---
  const fetchSocialData = useCallback(async (showLoader = false) => {
    if (!username) return;
    if (showLoader) setLoading(true);

    try {
      // Lanzamos ambas peticiones a la vez para ir más rápido
      const [friendsData, requestsData] = await Promise.all([
        gameService.getFriends(),
        gameService.getPendingRequests()
      ]);

      setFriends(friendsData);
      setRequests(requestsData);
    } catch (err) {
      console.error("Error cargando datos sociales:", err);
    } finally {
      setLoading(false);
    }
  }, [username]);

  // ---  EFECTO DE AUTO-REFRESCO (POLLING) ---
  useEffect(() => {
    if (isOpen && username) {
      // Carga inicial
      fetchSocialData(true);

      // Creamos un intervalo para que se recargue solo cada 15 segundos
      const interval = setInterval(() => {
        fetchSocialData(false); // Recarga silenciosa (sin loader)
      }, 15000);

      return () => clearInterval(interval); // Limpiamos al cerrar
    }
  }, [fetchSocialData, isOpen, username]);


  // Maneja la limpieza del input (solo mayúsculas y quita almohadillas accidentales)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace('#', '').toUpperCase();
    if (value.length <= 8) setSearchCode(value);
  };

  const handleAddFriend = async () => {
    if (!searchCode.trim()) return;

    try {
      // 1. Buscamos al dueño de ese código
      const targetUser = await gameService.searchUserByCode(searchCode);

      if (targetUser) {
        await gameService.followUser(targetUser.username);
        alert(t('friends.alert_now_following', { username: targetUser.username }));
        setSearchCode(''); // Limpiamos el buscador

        fetchSocialData();

        // 3. Opcional: Refrescar la lista de amigos
        const updatedFriends = await gameService.getFriends();
        setFriends(updatedFriends);
      } else {
        alert(t('friends.alert_not_found'));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al añadir amigo";
      alert(message);
    }
  };

  const handleRespond = async (requestId: string, action: 'accepted' | 'rejected') => {
    try {
      // 1. Llamamos al servicio (Lógica de Red)
      await gameService.respondToFriendRequest(requestId, action);

      fetchSocialData();

      // 2. Actualizamos la UI localmente (Lógica de Interfaz)
      setRequests(prev => prev.filter(r => r.id !== requestId));

      // 3. Si aceptamos, traemos la lista de amigos actualizada
      if (action === 'accepted') {
        const updatedFriends = await gameService.getFriends();
        setFriends(updatedFriends);
      }
    } catch (error: unknown) {
      console.error("Error al responder solicitud:", error);
      alert(t('friends.alert_respond_error'));
    }
  };

  const handleViewProfileFromSearch = async () => {
    if (!searchCode.trim()) return;

    try {
      const targetUser = await gameService.searchUserByCode(searchCode);
      if (targetUser) {
        // Pasamos el username del usuario ENCONTRADO, no el nuestro
        onTriggerPublicProfile(targetUser.username);
      } else {
        alert(t('friends.alert_not_found'));
      }
    } catch {
      alert(t('friends.alert_search_error'));
    }
  };


  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className="friends-sidebar-overlay"
      role="button"
      tabIndex={0}
      aria-label={t('common.close')}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
          onClose();
        }
      }}
    >
      <div className="friends-sidebar-content">
        <button className="close-button" onClick={onClose}>&times;</button>
        
        <h2 className="sidebar-title">{t('friends.social')}</h2>
        
        {/* Perfil del usuario con botón de pendientes al lado */}
        <div className="user-mini-profile">
           <div className="avatar-circle">
              {icon ? (
                <img src={icon} alt="Avatar" className="avatar-img" />
              ) : (
                username[0]?.toUpperCase()
              )}
            </div>
           <div className="profile-info-text">
              <span className="profile-name">{displayName || username}</span>
              <span className="profile-friend-code">#{friendCode}</span>
           </div>
           
           {/* Botón de Solicitudes Pendientes */}
           <button 
              type="button"
              className="pending-friend-btn pending-friend-btn-header"
              onClick={() => setShowRequests(true)}
            >
             {t('friends.pending_requests')}
              {requests.length > 0 && <span className="req-count">{requests.length}</span>}
            </button>
        </div>

        {/* Buscador para añadir nuevos amigos */}
        <div className="search-container">
          <div className="id-input-wrapper">
            <span className="static-hash">#</span>
            <input 
              type="text" 
              className="friends-input-id" 
              placeholder={t('friends.code_placeholder')}
              value={searchCode}
              onChange={handleInputChange}
            />
          </div>
          <div className="search-button-group">
            <button className="view-profile-btn" onClick={handleViewProfileFromSearch}>
              {t('friends.view_profile')}
            </button>
            <button className="add-friend-btn" onClick={handleAddFriend}>
              {t('friends.add')}
            </button>
          </div>

        </div>

        {/* Área dinámica de la lista */}
        <div className="friends-list-area">
          {loading ? (
            <div className="empty-list-box">{t('common.loading')}</div>
          ) : showRequests ? (
            /* VISTA DE SOLICITUDES PENDIENTES */
            <>
              <div className="list-header">
                <p className="list-status-label">{t('friends.received_requests')}</p>
                <button 
                  type="button"
                  className="pending-friend-btn"
                  onClick={() => setShowRequests(false)}
                >
                  {t('friends.back_to_friends')}
                </button>
              </div>
              {requests.length > 0 ? (
                requests.map((req) => (
                  <div key={req.id} className="friend-item-row request-row">
                    <span className="friend-name">{req.sender}</span>
                    <div className="request-actions">
                      <button className="action-btn accept" onClick={() => handleRespond(req.id, 'accepted')}>✅</button>
                      <button className="action-btn reject" onClick={() => handleRespond(req.id, 'rejected')}>❌</button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-list-box">{t('friends.no_pending')}</div>
              )}
            </>
          ) : (
            /* VISTA DE AMIGOS (Por defecto) */
            <>
              <p className="list-status-label">{t('friends.connected_count', { count: friends.length })}</p>
              {friends.length > 0 ? (
                friends.map((friend, index) => (
                  <div key={index} className="friend-item-row">
                    <div className={`status-dot ${friend.status}`}></div>
                    <span className="friend-name">{friend.name}</span>
                    <button
                      className="invite-btn"
                      type="button"
                      onClick={() => onInviteFriend?.(friend.name)}
                      disabled={Boolean(inviteLoadingUser && inviteLoadingUser === friend.name)}
                    >
                      {inviteLoadingUser && inviteLoadingUser === friend.name ? t('common.loading') : t('friends.invite')}
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-list-box">{t('friends.empty_list')}</div>
              )}
            </>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
};
