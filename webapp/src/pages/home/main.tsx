import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

import { MenuBackgroundShell } from '../../components/layout/MenuBackgroundShell';
import { LanguageModal } from '../../components/modals/LanguageModal';
import { TutorialScreen } from '../../screens/TutorialScreen';
import HomeScreen from '../../screens/HomeScreen';
import { enableGuestSession } from '../../utils/sessionUtils';

import '../../css/App.css';
import '../../css/Log.css';
import '../../index.css';

const HomeApp = () => {
  const [username, setUsername] = useState(localStorage.getItem('yovi_user') || '');
  const [showLanguageScreen, setShowLanguageScreen] = useState(false);
  const [showTutorialScreen, setShowTutorialScreen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('yovi_user');
    if (!storedUser) return;
    if (window.location.pathname.includes('/gamemode.html')) return;
    window.location.replace('/gamemode.html');
  }, []);

  useEffect(() => {
    if (username) {
      localStorage.setItem('yovi_user', username);
    } else if (localStorage.getItem('yovi_session_type') !== 'guest') {
      localStorage.removeItem('yovi_user');
    }
  }, [username]);

  return (
    <MenuBackgroundShell>
      {(background) => (
        <>
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

          <LanguageModal
            isOpen={showLanguageScreen}
            onClose={() => setShowLanguageScreen(false)}
          />

          <TutorialScreen
            isOpen={showTutorialScreen}
            onClose={() => setShowTutorialScreen(false)}
          />
        </>
      )}
    </MenuBackgroundShell>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<HomeApp />);
}

export default HomeApp;
