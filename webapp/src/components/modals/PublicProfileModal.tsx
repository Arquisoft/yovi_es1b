import { useTranslation } from 'react-i18next';
import { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { gameService, type PublicProfileResponse } from '../../services/gameService';
import '../../css/Game.css';

const iconModules = import.meta.glob('../../assets/icon/*.{png,jpg,jpeg,webp,svg}', {
    eager: true,
    import: 'default',
}) as Record<string, string>;

interface PublicProfileModalProps {
    username: string;
    onClose: () => void;
}

export const PublicProfileModal = ({ username, onClose }: PublicProfileModalProps) => {
    const { t } = useTranslation();
    const [data, setData] = useState<PublicProfileResponse | null>(null);
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
        void Promise.resolve().then(() => fetchProfile(true));
    }, [fetchProfile]);

    const handleAddFriend = async () => {
        if (!myUsername || !data) return;
        try {
            await gameService.followUser( data.username);
            // Refrescamos sin mostrar el loader para que el botón cambie suavemente
            fetchProfile(false); 
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '';
            alert(message || t('profile.error_add_friend'));
        }
    };

    const handleCancelRequest = async () => {
        if (!myUsername || !data) return;
        try {
            await gameService.cancelFriendRequest(myUsername, data.username);
            fetchProfile(false); 
        } catch {
            alert(t('profile.error_cancel_request'));
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
            case 'self': return <button type="button" className="profile-add-btn disabled" disabled>{t('profile.is_you')}</button>;
            case 'pending': return (
                <button type="button" className="profile-add-btn cancel" onClick={handleCancelRequest}>
                    {t('profile.cancel_request')}
                </button>
            );
            case 'accepted': return <button type="button" className="profile-add-btn accepted" disabled>{t('profile.already_friends')}</button>;
            default: return <button type="button" className="profile-add-btn" onClick={handleAddFriend}>{t('profile.add_friend')}</button>;
        }
    };

    if (loading) return ReactDOM.createPortal(
        <div className="modal-backdrop profile-overlay">
            <div className="loader-neon">{t('common.loading')}</div>
        </div>,
        document.body
    );

    if (!data) return null;

    const userIcon = resolveIcon(data.iconName);

    return ReactDOM.createPortal(
        // Añadido onClick={onClose} al fondo para poder cerrar al hacer clic fuera
        <div
            className="modal-backdrop profile-overlay"
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
            <div className="profile-card">
                <button type="button" className="profile-close-button" onClick={onClose}>&times;</button>

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

                {/* ... victorias y derrotas ... */}
                <div className="profile-stat-box highlight">
                    <span className="stat-num">{data.stats.totalScore || 0}</span>
                    <span className="stat-desc">{t('profile.total_score')}</span>
                </div>

                <div className="profile-stats-grid">
                    <div className="profile-stat-box">
                        <span className="stat-num">{data.stats.wins}</span>
                        <span className="stat-desc">{t('profile.wins')}</span>
                    </div>
                    <div className="profile-stat-box">
                        <span className="stat-num">{data.stats.losses}</span>
                        <span className="stat-desc">{t('profile.losses')}</span>
                    </div>
                    <div className="profile-stat-box">
                        <span className="stat-num">
                            {data.stats.totalGames > 0
                                ? ((data.stats.wins / data.stats.totalGames) * 100).toFixed(1)
                                : 0}%
                        </span>
                        <span className="stat-desc">{t('profile.win_rate')}</span>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
