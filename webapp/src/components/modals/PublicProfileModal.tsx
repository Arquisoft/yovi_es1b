import { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { gameService } from '../../services/gameService';
import '../../css/Game.css';

const iconModules = import.meta.glob('../../assets/icon/*.{png,jpg,jpeg,webp,svg}', {
    eager: true,
    import: 'default',
}) as Record<string, string>;

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
    relationship: 'none' | 'pending' | 'accepted' | 'self';
}

interface PublicProfileModalProps {
    username: string;
    onClose: () => void;
}

export const PublicProfileModal = ({ username, onClose }: PublicProfileModalProps) => {
    const [data, setData] = useState<PublicProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const myUsername = localStorage.getItem('yovi_user') || '';

    // Usamos useCallback para que la función sea estable
    const fetchProfile = useCallback((showLoader = false) => {
        if (showLoader) setLoading(true);
        
        gameService.getPublicProfile(username, myUsername)
            .then(res => {
                setData(res);
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
                onClose();
            });
    }, [username, myUsername, onClose]);


    useEffect(() => {
        fetchProfile(true);
    }, [fetchProfile]);

    const handleAddFriend = async () => {
        if (!myUsername || !data) return;
        try {
            await gameService.followUser(myUsername, data.username);
            // Refrescamos sin mostrar el loader para que el botón cambie suavemente
            fetchProfile(false); 
        } catch (error: any) {
            alert(error.message || "Error al añadir amigo");
        }
    };

    const handleCancelRequest = async () => {
        if (!myUsername || !data) return;
        try {
            await gameService.cancelFriendRequest(myUsername, data.username);
            fetchProfile(false); 
        } catch (error: any) {
            alert("No se pudo cancelar la solicitud");
        }
    };

    const resolveIcon = (iconName: string | null) => {
        if (!iconName) return null;
        const match = Object.entries(iconModules).find(([path]) =>
            path.toLowerCase().includes(iconName.toLowerCase())
        );
        return match ? match[1] : null;
    };

    const renderActionButton = () => {
        if (!data) return null;
        switch (data.relationship) {
            case 'self': return <button className="profile-add-btn disabled" disabled>ERES TÚ</button>;
            case 'pending': return (
                <button className="profile-add-btn cancel" onClick={handleCancelRequest}>
                    CANCELAR SOLICITUD
                </button>
            );
            case 'accepted': return <button className="profile-add-btn accepted" disabled>YA SOIS AMIGOS</button>;
            default: return <button className="profile-add-btn" onClick={handleAddFriend}>AÑADIR AMIGO</button>;
        }
    };

    if (loading) return ReactDOM.createPortal(
        <div className="modal-backdrop profile-overlay">
            <div className="loader-neon">Cargando...</div>
        </div>,
        document.body
    );

    if (!data) return null;

    const userIcon = resolveIcon(data.iconName);

    return ReactDOM.createPortal(
        // Añadido onClick={onClose} al fondo para poder cerrar al hacer clic fuera
        <div className="modal-backdrop profile-overlay" onClick={onClose}>
            <div className="profile-card" onClick={e => e.stopPropagation()}>
                <button className="profile-close-button" onClick={onClose}>&times;</button>

                <div className="profile-header-content">
                    <div className="profile-avatar-wrapper">
                        {userIcon ? (
                            <img src={userIcon} alt="Avatar" className="avatar-img" />
                        ) : (
                            <div className="avatar-letter">{data.nickname[0]?.toUpperCase()}</div>
                        )}
                    </div>
                    <h2 className="profile-nickname">{data.nickname}</h2>
                    <span className="profile-friend-code">#{data.friendCode}</span>
                    {renderActionButton()}
                </div>

                <div className="profile-stats-grid">
                    <div className="profile-stat-box">
                        <span className="stat-num">{data.stats.wins}</span>
                        <span className="stat-desc">Victorias</span>
                    </div>
                    <div className="profile-stat-box">
                        <span className="stat-num">{data.stats.losses}</span>
                        <span className="stat-desc">Derrotas</span>
                    </div>
                    <div className="profile-stat-box">
                        <span className="stat-num">
                            {data.stats.totalGames > 0
                                ? ((data.stats.wins / data.stats.totalGames) * 100).toFixed(1)
                                : 0}%
                        </span>
                        <span className="stat-desc">Ratio de victorias</span>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};