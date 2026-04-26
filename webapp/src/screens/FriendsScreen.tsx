import { useState } from 'react';
import { API_BASE_URL } from '../constants/config';
import { useTranslation } from 'react-i18next';

// Definimos la interfaz para los usuarios que busquemos
interface UserResult {
  username: string;
  nickname?: string;
  isFollowing?: boolean;
}

interface FriendsScreenProps {
  currentUser: string;
  onBack: () => void;
}


export default function FriendsScreen({ currentUser, onBack }: FriendsScreenProps) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);

  // Función para buscar usuarios
  const handleSearch = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/search?query=${searchQuery}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data);
      }
    } catch (error) {
      console.error("Error buscando usuarios:", error);
    }
  };

  // Función para seguir a un usuario
  const handleFollow = async (targetUsername: string) => {
    try {
      await fetch(`${API_BASE_URL}/users/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          follower: currentUser,
          following: targetUsername
        }),
      });
      // Aquí podrías actualizar el estado local para mostrar "Siguiendo"
    } catch (error) {
      console.error("Error al seguir usuario:", error);
    }
  };

  return (
    <div className="home-screen">
      <h2 className="welcome-title">{t('friends.title')}</h2>

      <div className="choose-option">
        <h3>{t('friends.search_title')}</h3>
        
        <input
          type="text"
          className="form-input"
          placeholder={t('friends.search_placeholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        
        <button className="submit-button" onClick={handleSearch}>
          {t('friends.search_button')}
        </button>

        <div className="results-container friends-results-container">
          {results.map((user) => {
            const displayName = user.nickname || user.username;
            return (
            <div key={user.username} className="user-result-item" >
              <span>{displayName}</span>
              <button 
                className="nav-btn friends-follow-btn" 
                onClick={() => handleFollow(displayName)}
              >
                {t('friends.follow')}
              </button>
            </div>
          )})}
          {results.length === 0 && searchQuery && (
            <p>{t('friends.no_results')}</p>
          )}
        </div>
      </div>

      <button className="submit-button" onClick={onBack}>
        {t('common.back')}
      </button>
    </div>
  );
}
