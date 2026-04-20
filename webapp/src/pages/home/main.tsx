import { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom/client'
import HomeScreen from '../../screens/HomeScreen'
import { TutorialScreen } from '../../screens/TutorialScreen'
import { enableGuestSession } from '../../utils/sessionUtils'
import '../../css/App.css'
import '../../css/Log.css'
import '../../index.css'
import menuVideo from '../../assets/background_video.mp4'
import backgroundMusic from '../../assets/background_music.mp3'
import { useTranslation } from 'react-i18next'

const HomeApp = () => {
  const { t } = useTranslation()
  const [username, setUsername] = useState(localStorage.getItem('yovi_user') || '')
  const [showSettings, setShowSettings] = useState(false)
  const [showTutorialScreen, setShowTutorialScreen] = useState(false)
  const [musicVolume, setMusicVolume] = useState(0.4)
  const [isVideoPaused, setIsVideoPaused] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    localStorage.setItem('yovi_user', username)
  }, [username])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.min(1, Math.max(0, musicVolume))
    }
  }, [musicVolume])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (isVideoPaused) {
      video.pause()
    } else {
      video.play().catch(() => {})
    }
  }, [isVideoPaused])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const storedTime = Number(localStorage.getItem('yovi_bg_time') || '0')
    if (!Number.isNaN(storedTime) && storedTime > 0) {
      const applyTime = () => {
        audio.currentTime = Math.min(storedTime, Math.max(0, audio.duration || storedTime))
      }
      if (audio.readyState >= 1) {
        applyTime()
      } else {
        audio.addEventListener('loadedmetadata', applyTime, { once: true })
      }
    }

    const saveTime = () => {
      localStorage.setItem('yovi_bg_time', String(audio.currentTime || 0))
    }
    const intervalId = window.setInterval(saveTime, 1000)
    window.addEventListener('beforeunload', saveTime)
    document.addEventListener('visibilitychange', saveTime)

    return () => {
      saveTime()
      window.clearInterval(intervalId)
      window.removeEventListener('beforeunload', saveTime)
      document.removeEventListener('visibilitychange', saveTime)
    }
  }, [])

  return (
    <div className="App">
      <video ref={videoRef} className="menu-video-bg" autoPlay loop muted playsInline>
        <source src={menuVideo} type="video/mp4"/>
      </video>
      <div className="menu-video-overlay"/>
      <audio ref={audioRef} className="bg-music" src={backgroundMusic} autoPlay loop />

      <HomeScreen
        username={username}
        onUsernameChange={setUsername}
        onStart={() => {
          enableGuestSession()
          globalThis.location.href = '/game.html'
        }}
        onGoToRegister={() => (globalThis.location.href = '/register.html')}
        onGoToLogin={() => (globalThis.location.href = '/login.html')}
        onOpenSettings={() => setShowSettings(true)}
        onOpenTutorial={() => setShowTutorialScreen(true)}
      />

      {showSettings && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Configuración de elementos de fondo">
          <div className="modal-box">
            <h3>{t('game.settings_title')}</h3>
            <div className="form-group">
              <label htmlFor="music-volume">{t('game.music_volume')}</label>
              <input
                id="music-volume"
                className="form-input"
                type="range"
                min="0"
                max="100"
                value={Math.round(musicVolume * 100)}
                onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="video-static">{t('game.video_moving')}</label>
              <input
                id="video-static"
                type="checkbox"
                checked={!isVideoPaused}
                onChange={(e) => setIsVideoPaused(!e.target.checked)}
              />
            </div>
            <button type="button" className="submit-button settings-close-button" onClick={() => setShowSettings(false)}>
              {t('common.close')}
            </button>
          </div>
        </div>
      )}

      <TutorialScreen
        isOpen={showTutorialScreen}
        onClose={() => setShowTutorialScreen(false)}
      />
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<HomeApp />)
