import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { gameService } from '../../services/gameService';

interface FriendsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  displayName: string;
  friendCode: string;
  icon?: string | null;
}

export const FriendsPanel = ({ isOpen, onClose, username, displayName, friendCode, icon }: FriendsPanelProps) => {
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  const [showRequests, setShowRequests] = useState(false); // Estado para alternar entre lista y solicitudes

  useEffect(() => {
    if (isOpen && username) {
      setLoading(true);
      // cargar amigos
      gameService.getFriends(username)
        .then(data => setFriends(data))
        .finally(() => setLoading(false));
        
        // Cargar Solicitudes Pendientes
      gameService.getPendingRequests(username)
        .then(data => setRequests(data))
        .catch(err => console.error("Error cargando solicitudes", err));
    }
  }, [isOpen, username]);


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
        // 2. Si existe, lo seguimos
        await gameService.followUser(username, targetUser.username);
        
        alert(`¡Ahora sigues a ${targetUser.username}!`);
        setSearchCode(''); // Limpiamos el buscador
        
        // 3. Opcional: Refrescar la lista de amigos
        const updatedFriends = await gameService.getFriends(username);
        setFriends(updatedFriends);
      } else {
        alert("No se encontró ningún jugador con ese código.");
      }
    } catch (error: any) {
      alert(error.message || "Error al añadir amigo");
    }
  };

  const handleRespond = async (requestId: string, action: 'accepted' | 'rejected') => {
    try {
      // 1. Llamamos al servicio (Lógica de Red)
      await gameService.respondToFriendRequest(requestId, action);

      // 2. Actualizamos la UI localmente (Lógica de Interfaz)
      setRequests(prev => prev.filter(r => r.id !== requestId));

      // 3. Si aceptamos, traemos la lista de amigos actualizada
      if (action === 'accepted') {
        const updatedFriends = await gameService.getFriends(username);
        setFriends(updatedFriends);
      }
    } catch (error: any) {
      console.error("Error al responder solicitud:", error.message);
      alert("No se pudo procesar la respuesta.");
    }
  };


  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="friends-sidebar-overlay" onClick={onClose}>
      <div className="friends-sidebar-content" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>&times;</button>
        
        <h2 className="sidebar-title">Social</h2>
        
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
              <span className="profile-friend-code">{friendCode}</span>
           </div>
           
           {/* Botón de Solicitudes Pendientes */}
           <button 
              type="button"
              className="pending-friend-btn"
              onClick={() => setShowRequests(true)}
              style={{ marginLeft: 'auto', position: 'relative' }} 
            >
              SOLICITUDES PENDIENTES
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
              placeholder="CÓDIGO" 
              value={searchCode}
              onChange={handleInputChange}
            />
          </div>
          <button className="add-friend-btn" onClick={handleAddFriend}>
            Añadir
          </button>
        </div>

        {/* Área dinámica de la lista */}
        <div className="friends-list-area">
          {loading ? (
            <div className="empty-list-box">Cargando...</div>
          ) : showRequests ? (
            /* VISTA DE SOLICITUDES PENDIENTES */
            <>
              <div className="list-header">
                <p className="list-status-label">Solicitudes recibidas</p>
                <button 
                  type="button"
                  className="pending-friend-btn"
                  onClick={() => setShowRequests(false)}
                >
                  Volver a amigos
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
            /* VISTA DE AMIGOS (Por defecto) */
            <>
              <p className="list-status-label">Amigos conectados — {friends.length}</p>
              {friends.length > 0 ? (
                friends.map((friend, index) => (
                  <div key={index} className="friend-item-row">
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