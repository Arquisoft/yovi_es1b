import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

import { MenuBackgroundShell } from '../../components/layout/MenuBackgroundShell';
import { LanguageModal } from '../../components/modals/LanguageModal';
import i18n from '../../i18n';
import { GameModeScreen } from '../../screens/GameModeScreen';
import { ProfileScreen } from '../../screens/ProfileScreen';
import { TutorialScreen } from '../../screens/TutorialScreen';
import { gameService } from '../../services/gameService';
import type { GameMode } from '../../types/socketEvents';

import '../../css/App.css';
import '../../css/Log.css';
import '../../index.css';

export const GameModePage = () => {
  const [showLanguageScreen, setShowLanguageScreen] = useState(false);
  const [showProfileScreen, setShowProfileScreen] = useState(false);
  const [showTutorialScreen, setShowTutorialScreen] = useState(false);
  const languageToI18n: Record<string, string> = {
    Spain: 'es',
    English: 'en',
    German: 'de',
    Portuguese: 'pt',
    es: 'es',
    en: 'en',
    de: 'de',
    pt: 'pt',
  };

  const applyLanguage = (language?: string | null) => {
    const resolvedLanguage = languageToI18n[language || ''] ?? 'es';
    void i18n.changeLanguage(resolvedLanguage);
    document.documentElement.lang = resolvedLanguage;
  };

  useEffect(() => {
    let active = true;
    applyLanguage(localStorage.getItem('yovi_user_language'));

    gameService.getProfile()
      .then((profile) => {
        if (!active || profile?.error) return;
        const safeLanguage =
          profile.language === 'Spain' ||
          profile.language === 'English' ||
          profile.language === 'German' ||
          profile.language === 'Portuguese'
            ? profile.language
            : 'Spain';
        applyLanguage(safeLanguage);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('yovi_user')) {
      globalThis.location.href = '/index.html';
    }
  }, []);

  const handleSelectMode = (mode: GameMode) => {
    sessionStorage.setItem('yovi_gamemode', mode);
    sessionStorage.setItem('yovi_previous_gamemode', mode);
    globalThis.location.href = '/game.html';
  };

  return (
    <MenuBackgroundShell>
      {(background) => (
        <div className="menu-content">
          <GameModeScreen
            onSelectMode={handleSelectMode}
            onOpenLanguage={() => setShowLanguageScreen(true)}
            onOpenProfile={() => setShowProfileScreen(true)}
            onOpenSettings={() => background.setShowSettings(true)}
            onOpenTutorial={() => setShowTutorialScreen(true)}
            onLogout={async () => {
              await gameService.logout().catch(() => undefined);
              sessionStorage.clear();
              localStorage.removeItem('yovi_user');
              localStorage.removeItem('yovi_friend_code');
              localStorage.removeItem('yovi_user_icon');
              localStorage.removeItem('yovi_user_language');
              localStorage.removeItem('yovi_user_nickname');
              localStorage.removeItem('username');
              globalThis.location.href = '/index.html';
            }}
          />
          <LanguageModal
            isOpen={showLanguageScreen}
            onClose={() => setShowLanguageScreen(false)}
          />
          <TutorialScreen
            isOpen={showTutorialScreen}
            onClose={() => setShowTutorialScreen(false)}
          />
          <ProfileScreen
            isOpen={showProfileScreen}
            username={localStorage.getItem('yovi_user') || ''}
            onClose={() => setShowProfileScreen(false)}
          />
        </div>
      )}
    </MenuBackgroundShell>
  );
};

export default GameModePage;

ReactDOM.createRoot(document.getElementById('root')!).render(<GameModePage />);
