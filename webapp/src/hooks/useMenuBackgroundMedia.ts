import { useEffect, useRef, useState } from 'react'

const BG_VOLUME_KEY = 'yovi_bg_volume'
const BG_VIDEO_PAUSED_KEY = 'yovi_bg_video_paused'
const BG_TIME_KEY = 'yovi_bg_time'

const readStoredNumber = (key: string, fallback: number) => {
  const rawValue = localStorage.getItem(key)
  if (rawValue === null) return fallback
  const parsedValue = Number(rawValue)
  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

const readStoredBoolean = (key: string, fallback: boolean) => {
  const rawValue = localStorage.getItem(key)
  if (rawValue === null) return fallback
  if (rawValue === 'true') return true
  if (rawValue === 'false') return false
  return fallback
}

export const useMenuBackgroundMedia = () => {
  const [showSettings, setShowSettings] = useState(false)
  const [musicVolume, setMusicVolume] = useState(() =>
    Math.min(1, Math.max(0, readStoredNumber(BG_VOLUME_KEY, 0.4)))
  )
  const [isVideoPaused, setIsVideoPaused] = useState(() =>
    readStoredBoolean(BG_VIDEO_PAUSED_KEY, false)
  )
  const audioRef = useRef<HTMLAudioElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.min(1, Math.max(0, musicVolume))
    }
    localStorage.setItem(BG_VOLUME_KEY, String(Math.min(1, Math.max(0, musicVolume))))
  }, [musicVolume])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (isVideoPaused) {
      video.pause()
    } else {
      video.play().catch(() => {})
    }
    localStorage.setItem(BG_VIDEO_PAUSED_KEY, String(isVideoPaused))
  }, [isVideoPaused])

  useEffect(() => {
    const syncFromStorage = (event: StorageEvent) => {
      if (event.storageArea !== localStorage) return
      if (event.key === BG_VOLUME_KEY) {
        const nextVolume = Math.min(1, Math.max(0, Number(event.newValue ?? '0.4')))
        setMusicVolume((current) => (current === nextVolume ? current : nextVolume))
      }
      if (event.key === BG_VIDEO_PAUSED_KEY) {
        const nextPaused = event.newValue === 'true'
        setIsVideoPaused((current) => (current === nextPaused ? current : nextPaused))
      }
    }

    window.addEventListener('storage', syncFromStorage)
    return () => window.removeEventListener('storage', syncFromStorage)
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const storedTime = Number(localStorage.getItem(BG_TIME_KEY) || '0')
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
      localStorage.setItem(BG_TIME_KEY, String(audio.currentTime || 0))
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
