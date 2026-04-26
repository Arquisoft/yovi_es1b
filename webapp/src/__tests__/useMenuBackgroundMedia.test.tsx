import { useLayoutEffect } from 'react'
import { render, act } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest'
import { useMenuBackgroundMedia } from '../hooks/useMenuBackgroundMedia'

type HookApi = ReturnType<typeof useMenuBackgroundMedia>

const buildMediaElement = <T extends HTMLMediaElement>(tagName: 'audio' | 'video') => {
  const element = document.createElement(tagName) as T
  Object.defineProperty(element, 'currentTime', {
    configurable: true,
    writable: true,
    value: 0,
  })
  Object.defineProperty(element, 'duration', {
    configurable: true,
    writable: true,
    value: 120,
  })
  Object.defineProperty(element, 'readyState', {
    configurable: true,
    writable: true,
    value: 1,
  })
  return element
}

function HookHarness({
  audioEl,
  videoEl,
  onReady,
}: {
  audioEl: HTMLAudioElement
  videoEl: HTMLVideoElement
  onReady: (api: HookApi) => void
}) {
  const api = useMenuBackgroundMedia()

  useLayoutEffect(() => {
    const audioRef = api.audioRef as { current: HTMLAudioElement | null }
    const videoRef = api.videoRef as { current: HTMLVideoElement | null }
    audioRef.current = audioEl
    videoRef.current = videoEl
    onReady(api)
  }, [api, audioEl, onReady, videoEl])

  return null
}

describe('useMenuBackgroundMedia', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  test('clampa el volumen y alterna play/pause del video', async () => {
    const audioEl = buildMediaElement<HTMLAudioElement>('audio')
    const videoEl = buildMediaElement<HTMLVideoElement>('video')
    const playSpy = vi.spyOn(videoEl, 'play').mockResolvedValue(undefined)
    const pauseSpy = vi.spyOn(videoEl, 'pause')
    let api: HookApi | undefined

    render(<HookHarness audioEl={audioEl} videoEl={videoEl} onReady={(nextApi) => { api = nextApi }} />)

    expect(audioEl.volume).toBe(0.4)
    expect(playSpy).toHaveBeenCalledTimes(1)

    await act(async () => {
      api?.setMusicVolume(1.7)
      api?.setIsVideoPaused(true)
    })

    expect(audioEl.volume).toBe(1)
    expect(pauseSpy).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('yovi_bg_volume')).toBe('1')
    expect(localStorage.getItem('yovi_bg_video_paused')).toBe('true')
  })

  test('restaura volumen y estado de video desde localStorage al montar', () => {
    localStorage.setItem('yovi_bg_volume', '0.75')
    localStorage.setItem('yovi_bg_video_paused', 'true')
    const audioEl = buildMediaElement<HTMLAudioElement>('audio')
    const videoEl = buildMediaElement<HTMLVideoElement>('video')
    const playSpy = vi.spyOn(videoEl, 'play').mockResolvedValue(undefined)
    const pauseSpy = vi.spyOn(videoEl, 'pause')

    render(<HookHarness audioEl={audioEl} videoEl={videoEl} onReady={() => {}} />)

    expect(audioEl.volume).toBe(0.75)
    expect(pauseSpy).toHaveBeenCalledTimes(1)
    expect(playSpy).not.toHaveBeenCalled()
  })

  test('restaura y persiste yovi_bg_time cuando el audio ya tiene metadata', () => {
    localStorage.setItem('yovi_bg_time', '45')
    const audioEl = buildMediaElement<HTMLAudioElement>('audio')
    const videoEl = buildMediaElement<HTMLVideoElement>('video')
    vi.spyOn(videoEl, 'play').mockResolvedValue(undefined)
    vi.spyOn(videoEl, 'pause')
    const setIntervalSpy = vi.spyOn(window, 'setInterval')
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval')
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    const documentAddSpy = vi.spyOn(document, 'addEventListener')
    const documentRemoveSpy = vi.spyOn(document, 'removeEventListener')
    let api: HookApi | undefined

    const { unmount } = render(
      <HookHarness
        audioEl={audioEl}
        videoEl={videoEl}
        onReady={(nextApi) => {
          api = nextApi
        }}
      />
    )

    expect(audioEl.currentTime).toBe(45)
    expect(setIntervalSpy).toHaveBeenCalledTimes(1)
    expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
    expect(documentAddSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))

    act(() => {
      api?.setMusicVolume(0.25)
    })
    expect(audioEl.volume).toBe(0.25)

    audioEl.currentTime = 63
    unmount()

    expect(localStorage.getItem('yovi_bg_time')).toBe('63')
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1)
    expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
    expect(documentRemoveSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
  })

  test('usa loadedmetadata cuando el audio todavia no tiene metadata', () => {
    localStorage.setItem('yovi_bg_time', '88')
    const audioEl = buildMediaElement<HTMLAudioElement>('audio')
    Object.defineProperty(audioEl, 'readyState', {
      configurable: true,
      writable: true,
      value: 0,
    })
    const videoEl = buildMediaElement<HTMLVideoElement>('video')
    vi.spyOn(videoEl, 'play').mockResolvedValue(undefined)
    vi.spyOn(videoEl, 'pause')
    const metadataListeners: Array<() => void> = []
    vi.spyOn(audioEl, 'addEventListener').mockImplementation((event, listener) => {
      if (event === 'loadedmetadata') {
        metadataListeners.push(listener as () => void)
      }
    })

    render(
      <HookHarness
        audioEl={audioEl}
        videoEl={videoEl}
        onReady={() => {}}
      />
    )

    expect(audioEl.currentTime).toBe(0)
    expect(metadataListeners).toHaveLength(1)

    act(() => {
      metadataListeners[0]()
    })

    expect(audioEl.currentTime).toBe(88)
  })
})
