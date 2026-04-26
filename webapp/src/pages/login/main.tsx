import { StrictMode, useState } from 'react';
import ReactDOM from 'react-dom/client';

import { MenuBackgroundShell } from '../../components/layout/MenuBackgroundShell';
import { LanguageModal } from '../../components/modals/LanguageModal';
import LoginScreen from '../../screens/LoginScreen';
import { TutorialScreen } from '../../screens/TutorialScreen';
import { persistUserSession } from '../../utils/sessionUtils';

import '../../css/App.css';
import '../../css/Log.css';
import '../../index.css';

const LoginPage = () => {
  const [showLanguageScreen, setShowLanguageScreen] = useState(false);
  const [showTutorialScreen, setShowTutorialScreen] = useState(false);

  const handleLoginSuccess = (
    playerName: string,
    friendCode: string,
    icon?: string | null,
    nickname?: string | null,
    language?: string | null
  ) => {
    if (persistUserSession(playerName, { friendCode, icon, nickname, language })) {
      globalThis.location.href = '/gamemode.html';
    }
  };

  const handleBack = () => {
    globalThis.location.href = '/index.html';
  };

  return (
    <MenuBackgroundShell>
      {(background) => (
        <>
          <LoginScreen
            onBack={handleBack}
            onRegister={() => {
              globalThis.location.href = '/register.html';
            }}
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
        </>
      )}
    </MenuBackgroundShell>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LoginPage />
  </StrictMode>
);
