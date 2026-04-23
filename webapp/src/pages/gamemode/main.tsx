import { useEffect, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import { GameModeScreen } from '../../screens/GameModeScreen'
import type { GameMode } from '../../types/socketEvents'
import '../../css/App.css'
import '../../css/Log.css'
import '../../index.css'
import menuVideo from '../../assets/background_video.mp4'
import backgroundMusic from '../../assets/background_music.mp3'

export const GameModePage = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Si no hay usuario logeado, redigirir al login.
    if (!localStorage.getItem('yovi_user')) {
      window.location.href = '/index.html'
    }
  }, [])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.4
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.play().catch(() => {})
  }, [])

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

  const handleSelectMode = (mode: GameMode) => {
    // Guardar el modo seleccionado en sessionStorage para que la pantalla de juego lo sepa
    sessionStorage.setItem('yovi_gamemode', mode)
    // Redirigir a la página del juego
    window.location.href = '/game.html'
  }

  return (
    <div className="App">
      <video ref={videoRef} className="menu-video-bg" autoPlay loop muted playsInline>
        <source src={menuVideo} type="video/mp4" />
      </video>
      <div className="menu-video-overlay" />
      <audio ref={audioRef} className="bg-music" src={backgroundMusic} autoPlay loop />

      <div className="menu-content">
        <GameModeScreen 
          onSelectMode={handleSelectMode} 
          onLogout={() => {
            localStorage.removeItem('yovi_user')
            localStorage.removeItem('yovi_friend_code')
            localStorage.removeItem('yovi_user_icon')
            localStorage.removeItem('yovi_user_nickname')
            window.location.href = '/index.html'
          }}
        />
      </div>
    </div>
  )
}

export default GameModePage

ReactDOM.createRoot(document.getElementById('root')!).render(<GameModePage />)

