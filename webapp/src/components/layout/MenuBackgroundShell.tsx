import type { ReactNode } from 'react'
import { MenuBackgroundChrome } from './MenuBackgroundChrome'
import { useMenuBackgroundMedia } from '../../hooks/useMenuBackgroundMedia'

type BackgroundApi = ReturnType<typeof useMenuBackgroundMedia>

type MenuBackgroundShellProps = {
  children: (background: BackgroundApi) => ReactNode
}

export const MenuBackgroundShell = ({ children }: MenuBackgroundShellProps) => {
  const background = useMenuBackgroundMedia()

  return (
    <MenuBackgroundChrome
      audioRef={background.audioRef}
      isVideoPaused={background.isVideoPaused}
      musicVolume={background.musicVolume}
      setIsVideoPaused={background.setIsVideoPaused}
      setMusicVolume={background.setMusicVolume}
      setShowSettings={background.setShowSettings}
      showSettings={background.showSettings}
      videoRef={background.videoRef}
    >
      {children(background)}
    </MenuBackgroundChrome>
  )
}
