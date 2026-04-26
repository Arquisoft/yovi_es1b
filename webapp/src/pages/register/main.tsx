import { StrictMode, useState } from 'react';
import ReactDOM from 'react-dom/client';

import { MenuBackgroundChrome } from '../../components/layout/MenuBackgroundChrome';
import { LanguageModal } from '../../components/modals/LanguageModal';
import { useMenuBackgroundMedia } from '../../hooks/useMenuBackgroundMedia';
import RegisterScreen from '../../screens/RegisterScreen';
import { TutorialScreen } from '../../screens/TutorialScreen';
import { activateRegisteredSession, persistAuthToken, persistUserSession } from '../../utils/sessionUtils';

import '../../css/App.css';
import '../../css/Log.css';
import '../../index.css';

const RegisterPage = () => {
  const [showLanguageScreen, setShowLanguageScreen] = useState(false);
  const [showTutorialScreen, setShowTutorialScreen] = useState(false);
  const background = useMenuBackgroundMedia();

  const handleRegisterSuccess = (
    playerName: string,
    friendCode: string,
    icon?: string | null,
    language?: string | null,
    nickname?: string | null,
    token?: string | null
  ) => {
    if (persistUserSession(playerName, { friendCode, icon, language, nickname }) && activateRegisteredSession(playerName)) {
      if (token) {
        persistAuthToken(token);
      }
      globalThis.location.href = '/gamemode.html';
    }
  };

  const handleBack = () => {
    globalThis.location.href = '/index.html';
  };

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
      <RegisterScreen
        onBack={handleBack}
        onGoToLogin={() => {
          globalThis.location.href = '/login.html';
        }}
        onOpenLanguage={() => setShowLanguageScreen(true)}
        onOpenSettings={() => background.setShowSettings(true)}
        onOpenTutorial={() => setShowTutorialScreen(true)}
        onCreateAccount={handleRegisterSuccess}
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
    <RegisterPage />
  </StrictMode>
);
