import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

// Componentes UI y Layout
import { MenuBackgroundChrome } from '../../components/layout/MenuBackgroundChrome';
import { LanguageModal } from '../../components/modals/LanguageModal';
import { TutorialScreen } from '../../screens/TutorialScreen';
import HomeScreen from '../../screens/HomeScreen';

// Hooks y Utils
import { useMenuBackgroundMedia } from '../../hooks/useMenuBackgroundMedia';
import { enableGuestSession } from '../../utils/sessionUtils';

// Estilos
import '../../css/App.css';
import '../../css/Log.css';
import '../../index.css';

const HomeApp = () => {
    const [username, setUsername] = useState(localStorage.getItem('yovi_user') || '');
    const [showLanguageScreen, setShowLanguageScreen] = useState(false);
    const [showTutorialScreen, setShowTutorialScreen] = useState(false);

    // Hook que gestiona música, volumen y video (del archivo 2)
    const background = useMenuBackgroundMedia();

    // --- Lógica de redirección (del archivo 1) ---
    useEffect(() => {
        // Si ya hay usuario logeado, redirigir a selección de modo
        const storedUser = localStorage.getItem('yovi_user');
        if (!storedUser) return;

        // Evitar bucles si ya estamos en gamemode
        if (window.location.pathname.includes('/gamemode.html')) return;

        window.location.replace('/gamemode.html');
    }, []);

    // --- Persistencia de nombre (Refinado) ---
    useEffect(() => {
        if (username) {
            localStorage.setItem('yovi_user', username);
        } else {
            // Solo removemos si no es una sesión activa de invitado
            if (localStorage.getItem('yovi_session_type') !== 'guest') {
                localStorage.removeItem('yovi_user');
            }
        }
    }, [username]);

    return (
        <MenuBackgroundChrome
            audioRef={background.audioRef}
            isVideoPaused={background.isVideoPaused}
            musicVolume={background.musicVolume}
            setIsVideoPaused={background.setIsVideoPaused}
            setMusicVolume={background.setMusicVolume}
            setShowSettings={background.setShowSettings}
            showSettings={background.showSettings}
            videoRef={background.videoRef}
        >
            <HomeScreen
                username={username}
                onUsernameChange={setUsername}
                onStart={() => {
                    enableGuestSession();
                    globalThis.location.href = '/game.html';
                }}
                onGoToRegister={() => (globalThis.location.href = '/register.html')}
                onGoToLogin={() => (globalThis.location.href = '/login.html')}
                onOpenLanguage={() => setShowLanguageScreen(true)}
                onOpenSettings={() => background.setShowSettings(true)}
                onOpenTutorial={() => setShowTutorialScreen(true)}
            />

            {/* Modales adicionales */}
            <LanguageModal
                isOpen={showLanguageScreen}
                onClose={() => setShowLanguageScreen(false)}
            />

            <TutorialScreen
                isOpen={showTutorialScreen}
                onClose={() => setShowTutorialScreen(false)}
            />
        </MenuBackgroundChrome>
    );
};

// Renderizado
const rootElement = document.getElementById('root');
if (rootElement) {
    ReactDOM.createRoot(rootElement).render(<HomeApp />);
}

export default HomeApp;
