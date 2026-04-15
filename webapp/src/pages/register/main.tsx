import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import { MenuBackgroundChrome } from '../../components/layout/MenuBackgroundChrome'
import { useMenuBackgroundMedia } from '../../hooks/useMenuBackgroundMedia'
import RegisterScreen from '../../screens/RegisterScreen'
import { TutorialScreen } from '../../screens/TutorialScreen'
import { persistUserSession } from '../../utils/sessionUtils'
import '../../css/App.css'
import '../../css/Log.css'
import '../../index.css'

const RegisterPage = () => {
  const [showTutorialScreen, setShowTutorialScreen] = useState(false)
  const background = useMenuBackgroundMedia()

  const handleRegisterSuccess = (
    playerName: string,
    friendCode: string,
    icon?: string | null,
    language?: string | null,
    nickname?: string | null
  ) => {
    if (persistUserSession(playerName, { friendCode, icon, language, nickname })) {
      window.location.href = '/game.html'
    }
  }

  const handleBack = () => {
    window.location.href = '/index.html'
  }

  return (
    <MenuBackgroundChrome
      audioRef={background.audioRef}
      isVideoPaused={background.isVideoPaused}
      musicVolume={background.musicVolume}
      setIsVideoPaused={background.setIsVideoPaused}
      setMusicVolume={background.setMusicVolume}
      setShowSettings={background.setShowSettings}
      settingsAriaLabel="Configuración de elementos de fondo"
      settingsTitle="Configuración de elementos de fondo"
      showSettings={background.showSettings}
      videoLabel="Video en movimiento"
      videoRef={background.videoRef}
    >
      <RegisterScreen
        onBack={handleBack}
        onOpenSettings={() => background.setShowSettings(true)}
        onOpenTutorial={() => setShowTutorialScreen(true)}
        onCreateAccount={handleRegisterSuccess}
      />

      <TutorialScreen
        isOpen={showTutorialScreen}
        onClose={() => setShowTutorialScreen(false)}
      />
    </MenuBackgroundChrome>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RegisterPage />
  </React.StrictMode>
)
