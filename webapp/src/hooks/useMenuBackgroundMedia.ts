import { useEffect, useRef, useState } from 'react'

export const useMenuBackgroundMedia = () => {
  const [showSettings, setShowSettings] = useState(false)
  const [musicVolume, setMusicVolume] = useState(0.4)
  const [isVideoPaused, setIsVideoPaused] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

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

  return {
    audioRef,
    isVideoPaused,
    musicVolume,
    setIsVideoPaused,
    setMusicVolume,
    setShowSettings,
    showSettings,
    videoRef,
  }
}
