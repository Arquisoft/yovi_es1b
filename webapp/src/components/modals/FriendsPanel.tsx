import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { gameService } from '../../services/gameService';

// --- INTERFACES DE DATOS ---
interface Friend {
  name: string;
  status: string; // Cambiado de unión literal a string para evitar el error de asignación TS2345
}

interface FriendRequest {
  id: string;
  sender: string;
}

interface FriendsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  displayName: string;
  friendCode: string;
  icon?: string | null;
}

export const FriendsPanel = ({ isOpen, onClose, username, displayName, friendCode, icon }: FriendsPanelProps) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [showRequests, setShowRequests] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadSocialData = async () => {
      setLoading(true);
      try {
        // Ejecución en paralelo para optimizar la carga
        const [friendsData, requestsData] = await Promise.all([
          gameService.getFriends(),
          gameService.getPendingRequests()
        ]);

        // TypeScript ahora aceptará esto correctamente
        setFriends(friendsData);
        setRequests(requestsData);
      } catch (err) {
        console.error("Error cargando datos sociales:", err);
      } finally {
        setLoading(false);
      }
    };

    loadSocialData();
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace('#', '').toUpperCase();
    if (value.length <= 8) setSearchCode(value);
  };

  const handleAddFriend = async () => {
    if (!searchCode.trim()) return;

    try {
      const targetUser = await gameService.searchUserByCode(searchCode);

      if (targetUser) {
        await gameService.followUser(targetUser.username);
        alert(`¡Ahora sigues a ${targetUser.username}!`);
        setSearchCode('');

        const updatedFriends = await gameService.getFriends();
        setFriends(updatedFriends);
      } else {
        alert("No se encontró ningún jugador con ese código.");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al añadir amigo";
      alert(message);
    }
  };

  const handleRespond = async (requestId: string, action: 'accepted' | 'rejected') => {
    try {
      await gameService.respondToFriendRequest(requestId, action);

      setRequests(prev => prev.filter(r => r.id !== requestId));

      if (action === 'accepted') {
        const updatedFriends = await gameService.getFriends();
        setFriends(updatedFriends);
      }
    } catch (error: unknown) {
      console.error("Error al responder solicitud:", error);
      alert("No se pudo procesar la respuesta.");
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
      <div className="friends-sidebar-overlay" onClick={onClose}>
        <div className="friends-sidebar-content" onClick={e => e.stopPropagation()}>
          <button className="close-button" onClick={onClose} aria-label="Cerrar">&times;</button>

          <h2 className="sidebar-title">Social</h2>

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
              <span className="profile-friend-code">{friendCode}</span>
            </div>

            <button
                type="button"
                className="pending-friend-btn"
                onClick={() => setShowRequests(true)}
                style={{ marginLeft: 'auto', position: 'relative' }}
            >
              SOLICITUDES
              {requests.length > 0 && <span className="req-count">{requests.length}</span>}
            </button>
          </div>

          <div className="search-container">
            <div className="id-input-wrapper">
              <span className="static-hash">#</span>
              <input
                  type="text"
                  className="friends-input-id"
                  placeholder="CÓDIGO"
                  value={searchCode}
                  onChange={handleInputChange}
              />
            </div>
            <button className="add-friend-btn" onClick={handleAddFriend}>
              Añadir
            </button>
          </div>

          <div className="friends-list-area">
            {loading ? (
                <div className="empty-list-box">Cargando datos...</div>
            ) : showRequests ? (
                <>
                  <div className="list-header">
                    <p className="list-status-label">Solicitudes recibidas</p>
                    <button
                        type="button"
                        className="pending-friend-btn"
                        onClick={() => setShowRequests(false)}
                    >
                      Ver amigos
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
                      <div className="empty-list-box">No hay solicitudes pendientes</div>
                  )}
                </>
            ) : (
                <>
                  <p className="list-status-label">Amigos — {friends.length}</p>
                  {friends.length > 0 ? (
                      friends.map((friend, index) => (
                          <div key={`${friend.name}-${index}`} className="friend-item-row">
                            <div className={`status-dot ${friend.status}`}></div>
                            <span className="friend-name">{friend.name}</span>
                            <button className="invite-btn">Invitar</button>
                          </div>
                      ))
                  ) : (
                      <div className="empty-list-box">Tu lista está vacía</div>
                  )}
                </>
            )}
          </div>
        </div>
      </div>,
      document.body
  );
};