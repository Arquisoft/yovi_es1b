import "../../i18n";
import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { gameService } from '../../services/gameService';
import {useTranslation} from "react-i18next";

interface FriendsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  friendCode: string;
}

export const FriendsPanel = ({ isOpen, onClose, username, friendCode }: FriendsPanelProps) => {
    const { t } = useTranslation();
    const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && username) {
      setLoading(true);
      gameService.getFriends()
        .then(data => {
          setFriends(data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Error fetching friends:", err);
          setLoading(false);
        });
    }
  }, [isOpen, username]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(

    <div className="friends-sidebar-overlay" onClick={onClose}>
      <div className="friends-sidebar-content" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>&times;</button>

        <h2 className="sidebar-title">{t('friends.social')}</h2>

        {/* Perfil del usuario actual */}
        <div className="user-mini-profile">
           <div className="avatar-circle">
             {username[0]?.toUpperCase()}
           </div>
           <div className="profile-info-text">
              <span className="profile-name">{username}</span>
              <span className="profile-friend-code">#{friendCode}</span>
           </div>
           
        </div>

        {/* Buscador para añadir nuevos amigos */}
        <div className="search-container">
          <input type="text" className="friends-input" placeholder={t('friends.search_friend_placeholder')} />
          <button className="add-friend-btn">{t('friends.send_request')}</button>
        </div>

        {/* Área dinámica de la lista de amigos */}
        <div className="friends-list-area">
          <p className="list-status-label">{t('friends.connected_count', { count: friends.length })}</p>
          <div className="empty-list-box">
              {t('friends.empty_list')}
          </div>
          <p className="list-status-label">
              {t('friends.connected_count', { count: friends.length })}
          </p>
          
          {loading ? (
            <div className="empty-list-box">{t('common.loading')}</div>
          ) : friends.length > 0 ? (
            // Si hay amigos, los listamos
            friends.map((friend, index) => (
              <div key={index} className="friend-item-row">
                <div className={`status-dot ${friend.status}`}></div>
                <span className="friend-name">{friend.name}</span>
                <button 
                  className="invite-btn" 
                  onClick={() => console.log(`Invitando a ${friend.name}`)}
                >
                    {t('friends.invite')}
                </button>
              </div>
            ))
          ) : (
            // Si la lista está vacía
            <div className="empty-list-box">
                {t('friends.empty_list')}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}