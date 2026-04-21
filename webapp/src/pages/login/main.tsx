import { StrictMode, useState } from 'react';
import ReactDOM from 'react-dom/client';

import { MenuBackgroundChrome } from '../../components/layout/MenuBackgroundChrome';
import { LanguageModal } from '../../components/modals/LanguageModal';
import { useMenuBackgroundMedia } from '../../hooks/useMenuBackgroundMedia';
import LoginScreen from '../../screens/LoginScreen';
import { TutorialScreen } from '../../screens/TutorialScreen';
import { persistUserSession } from '../../utils/sessionUtils';

import '../../css/App.css';
import '../../css/Log.css';
import '../../index.css';

const LoginPage = () => {
  const [showLanguageScreen, setShowLanguageScreen] = useState(false);
  const [showTutorialScreen, setShowTutorialScreen] = useState(false);
  const background = useMenuBackgroundMedia();

  const handleLoginSuccess = (
    playerName: string,
    friendCode: string,
    icon?: string | null,
    nickname?: string | null,
    language?: string | null
  ) => {
    if (persistUserSession(playerName, { friendCode, icon, nickname, language })) {
      window.location.href = '/game.html';
    }
  };

  const handleBack = () => {
    window.location.href = '/index.html';
  };

  return (
    <MenuBackgroundChrome
      audioRef={background.audioRef}
      isVideoPaused={background.isVideoPaused}
      musicVolume={background.musicVolume}
      setIsVideoPaused={background.setIsVideoPaused}
      setMusicVolume={background.setMusicVolume}
      setShowSettings={background.setShowSettings}
      settingsAriaLabel="Configuración"
      settingsTitle="Configuración"
      showSettings={background.showSettings}
      videoLabel="Vídeo en movimiento"
      videoRef={background.videoRef}
    >
      <LoginScreen
        onBack={handleBack}
        onOpenLanguage={() => setShowLanguageScreen(true)}
        onOpenSettings={() => background.setShowSettings(true)}
        onOpenTutorial={() => setShowTutorialScreen(true)}
        onLogin={handleLoginSuccess}
      />

      <LanguageModal isOpen={showLanguageScreen} onClose={() => setShowLanguageScreen(false)} />

      <TutorialScreen
        isOpen={showTutorialScreen}
        onClose={() => setShowTutorialScreen(false)}
      />
    </MenuBackgroundChrome>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LoginPage />
  </StrictMode>
);
