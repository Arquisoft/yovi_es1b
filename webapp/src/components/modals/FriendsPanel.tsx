import ReactDOM from 'react-dom';

interface FriendsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
}

export const FriendsPanel = ({ isOpen, onClose, username }: FriendsPanelProps) => {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="friends-sidebar-overlay" onClick={onClose}>
      <div className="friends-sidebar-content" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>&times;</button>
        
        <h2 className="sidebar-title">Social</h2>
        
        <div className="user-mini-profile">
           <div className="avatar-circle">
             {username[0]?.toUpperCase()}
           </div>
           <span className="profile-name">{username}</span>
        </div>

        <div className="search-container">
          <input type="text" className="friends-input" placeholder="Buscar jugador..." />
          <button className="add-friend-btn">Enviar Solicitud</button>
        </div>

        <div className="friends-list-area">
          <p className="list-status-label">Amigos conectados — 0</p>
          <div className="empty-list-box">
             Tu lista está vacía
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};