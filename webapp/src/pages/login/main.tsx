import '../../i18n'
import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom/client'
import LoginScreen from '../../screens/LoginScreen'
import { TutorialScreen } from '../../screens/TutorialScreen'
import '../../css/App.css'
import '../../css/Log.css'
import '../../index.css'
import menuVideo from '../../assets/background_video.mp4'
import backgroundMusic from '../../assets/background_music.mp3'

const LoginPage = () => {
  const [showSettings, setShowSettings] = useState(false)
  const [showTutorialScreen, setShowTutorialScreen] = useState(false)
  const [musicVolume, setMusicVolume] = useState(0.4)
  const [isVideoPaused, setIsVideoPaused] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

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

  const handleLoginSuccess = (
    playerName: string,
    friendCode: string,
    icon?: string | null,
    nickname?: string | null,
    language?: string | null
  ) => {
    const name = playerName.trim()
    if (!name) return

    localStorage.setItem('yovi_user', name)
    localStorage.setItem('yovi_friend_code', friendCode)
    if (typeof icon === 'string' && icon.trim()) {
      localStorage.setItem('yovi_user_icon', icon)
    } else {
      localStorage.removeItem('yovi_user_icon')
    }
    if (typeof nickname === 'string' && nickname.trim()) {
      localStorage.setItem('yovi_user_nickname', nickname.trim())
    } else {
      localStorage.removeItem('yovi_user_nickname')
    }
    if (typeof language === 'string' && language.trim()) {
      localStorage.setItem('yovi_user_language', language.trim())
    } else {
      localStorage.removeItem('yovi_user_language')
    }

    window.location.href = '/game.html'
  }

  const handleBack = () => {
    window.location.href = '/index.html'
  }

  return (
    <div className="App">
      <video ref={videoRef} className="menu-video-bg" autoPlay loop muted playsInline>
        <source src={menuVideo} type="video/mp4"/>
      </video>
      <div className="menu-video-overlay"/>
      <audio ref={audioRef} className="bg-music" src={backgroundMusic} autoPlay loop />

      <LoginScreen
        onBack={handleBack}
        onOpenSettings={() => setShowSettings(true)}
        onOpenTutorial={() => setShowTutorialScreen(true)}
        onLogin={handleLoginSuccess}
      />

      {showSettings && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Configuración">
          <div className="modal-box">
            <h3>Configuración</h3>
            <div className="form-group">
              <label htmlFor="music-volume">Volumen de la música</label>
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
              <label htmlFor="video-static">Vídeo en movimiento</label>
              <input
                id="video-static"
                type="checkbox"
                checked={!isVideoPaused}
                onChange={(e) => setIsVideoPaused(!e.target.checked)}
              />
            </div>
            <button type="button" className="submit-button settings-close-button" onClick={() => setShowSettings(false)}>
              Cerrar
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LoginPage />
  </React.StrictMode>
)
