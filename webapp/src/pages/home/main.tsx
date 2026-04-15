import { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { MenuBackgroundChrome } from '../../components/layout/MenuBackgroundChrome'
import HomeScreen from '../../screens/HomeScreen'
import { TutorialScreen } from '../../screens/TutorialScreen'
import { useMenuBackgroundMedia } from '../../hooks/useMenuBackgroundMedia'
import { enableGuestSession } from '../../utils/sessionUtils'
import '../../css/App.css'
import '../../css/Log.css'
import '../../index.css'

const HomeApp = () => {
  const [username, setUsername] = useState(localStorage.getItem('yovi_user') || '')
  const [showTutorialScreen, setShowTutorialScreen] = useState(false)
  const background = useMenuBackgroundMedia()

  useEffect(() => {
    localStorage.setItem('yovi_user', username)
  }, [username])

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
      videoLabel="Vídeo en movimiento"
      videoRef={background.videoRef}
    >
      <HomeScreen
        username={username}
        onUsernameChange={setUsername}
        onStart={() => {
          enableGuestSession()
          globalThis.location.href = '/game.html'
        }}
        onGoToRegister={() => (globalThis.location.href = '/register.html')}
        onGoToLogin={() => (globalThis.location.href = '/login.html')}
        onOpenSettings={() => background.setShowSettings(true)}
        onOpenTutorial={() => setShowTutorialScreen(true)}
      />

      <TutorialScreen
        isOpen={showTutorialScreen}
        onClose={() => setShowTutorialScreen(false)}
      />
    </MenuBackgroundChrome>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<HomeApp />)
