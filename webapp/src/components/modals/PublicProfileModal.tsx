import  { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { gameService } from '../../services/gameService';
import '../../css/Game.css';

const iconModules = import.meta.glob('../../assets/icon/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;


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
  relationship: 'none' | 'pending' | 'accepted' | 'self'; // Relación con el usuario que lo ve
}

// Props para el modal de perfil público
interface PublicProfileModalProps {
  username: string;
  onClose: () => void;
}

export const PublicProfileModal = ({ username, onClose }: PublicProfileModalProps) => {
    const [data, setData] = useState<PublicProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    //const [isFollowing, setIsFollowing] = useState(false);
    const myUsername = localStorage.getItem('yovi_user') || '';

    // función para poder pedir los datos cuando queramos
    const fetchProfile = () => {
        gameService.getPublicProfile(username, myUsername)
            .then(res => {
                setData(res);
                setLoading(false);
            })
            .catch(() => onClose());
    };


    useEffect(() => {
        gameService.getPublicProfile(username, myUsername)
            .then(res => {
                setData(res);
                setLoading(false);
            })
            .catch(() => onClose());
    }, [username]);

    useEffect(() => {
        fetchProfile();
    }, [username]);

   
    const handleAddFriend = async () => {
        if (!myUsername || !data) return;
        try {
            await gameService.followUser(myUsername, data.username);
            // setIsFollowing(true);
            alert(`Solicitud enviada a ${data.nickname}`);
            fetchProfile(); // Refrescar datos para actualizar el botón
        } catch (error: any) {
            alert(error.message || "Error al añadir amigo");
        }
    };

    // Cancelar solicitud
    const handleCancelRequest = async () => {
        if (!myUsername || !data) return;
        try {
            await gameService.cancelFriendRequest(myUsername, data.username);
            fetchProfile(); // Refrescamos para que el botón vuelva a ser "Añadir"
        } catch (error: any) {
            alert("No se pudo cancelar la solicitud");
        }
    };


     // 2. Función para renderizar el botón dinámicamente
    const renderActionButton = () => {
        if (!data) return null;

        switch (data.relationship) {
            case 'self':
                return <button className="profile-add-btn disabled" disabled>ERES TÚ</button>;
            
            case 'pending':
                return (
                    <button className="profile-add-btn cancel" onClick={handleCancelRequest}>
                        CANCELAR SOLICITUD
                    </button>
                );
            
            case 'accepted':
                return <button className="profile-add-btn accepted" disabled>YA SOIS AMIGOS</button>;
            
            case 'none':
            default:
                return (
                    <button className="profile-add-btn" onClick={handleAddFriend}>
                        AÑADIR AMIGO
                    </button>
                );
        }
    };

    // FUNCIÓN PARA RESOLVER EL ICONO DEL USUARIO VISITADO
    const resolveIcon = (iconName: string | null) => {
        if (!iconName) return null;
        // Buscamos en los módulos importados aquel que contenga el nombre del archivo
        const match = Object.entries(iconModules).find(([path]) =>
            path.toLowerCase().includes(iconName.toLowerCase())
        );
        return match ? match[1] : null;
    };

    if (loading) return ReactDOM.createPortal(
        <div className="modal-backdrop profile-overlay">
        <div className="loader-neon">Cargando...</div>
        </div>,
        document.body
    );


    if (!data) return null;

    // Resolvemos la imagen usando el iconName que vino de la API
    const userIcon = resolveIcon(data.iconName);

    return ReactDOM.createPortal(
        <div className="modal-backdrop profile-overlay">
            <div className="profile-card" onClick={e => e.stopPropagation()}>
                <button className="profile-close-button" onClick={onClose}>x</button>

                <div className="profile-header-content">
                    <div className="profile-avatar-wrapper">
                        {userIcon ? (
                            <img src={userIcon} alt="Avatar" className="avatar-img" />
                        ) : (
                            username[0]?.toUpperCase()
                        )}
                    </div>
                    <h2 className="profile-nickname">{data.nickname}</h2>
                    <span className="profile-friend-code">#{data.friendCode}</span>

                    {/* --- NUEVO BOTÓN DE AÑADIR --- */}
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
                        <span className="stat-desc"> Ratio de victorias</span>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );

};
