import  { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { gameService } from '../../services/gameService';
import '../../css/Game.css';

// Modal para mostrar el perfil público de un usuario
interface PublicProfileData {
  username: string;
  nickname: string;
  iconName: string;
  friendCode: string;
  stats: {
    wins: number;
    losses: number;
    totalGames: number;
  };
}

// Props para el modal de perfil público
interface PublicProfileModalProps {
  username: string;
  onClose: () => void;
}

export const PublicProfileModal = ({ username, onClose }: PublicProfileModalProps) => {
    const [data, setData] = useState<PublicProfileData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        gameService.getPublicProfile(username)
            .then(res => {
                setData(res);
                setLoading(false);
            })
            .catch(() => onClose());
    }, [username]);

    if (loading) return <div className="modal-backdrop"><div className="loader">Cargando...</div></div>;

    if (!data) return null;

    return ReactDOM.createPortal(
        <div className="modal-backdrop profile-overlay">
            <div className="modal-box profile-card" onClick={e => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>x</button>

                <div className="profile-header">
                    <img src={`/src/assets/icon/${data.iconName}`} alt="avatar" className="profile-avatar-big" />
                    <h2>{data.nickname}</h2>
                    <span className="profile-code">#{data.friendCode}</span>
                </div>

                <div className="profile-stats-grid">
                    <div className="stat-item">
                        <span className="stat-value">{data.stats.wins}</span>
                        <span className="stat-label">Victorias</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{data.stats.losses}</span>
                        <span className="stat-label">Derrotas</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">
                            {data.stats.totalGames > 0
                                ? ((data.stats.wins / data.stats.totalGames) * 100).toFixed(1)
                                : 0}%
                        </span>
                        <span className="stat-label">Ratio de victorias</span>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );

};
