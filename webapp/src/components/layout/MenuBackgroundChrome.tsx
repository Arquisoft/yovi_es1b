import type { ReactNode, RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import backgroundMusic from '../../assets/background_music.mp3';
import menuVideo from '../../assets/background_video.mp4';

type MenuBackgroundChromeProps = {
  audioRef: RefObject<HTMLAudioElement>;
  children?: ReactNode;
  isVideoPaused: boolean;
  musicVolume: number;
  setIsVideoPaused: (value: boolean) => void;
  setMusicVolume: (value: number) => void;
  setShowSettings: (value: boolean) => void;
  showSettings: boolean;
  videoRef: RefObject<HTMLVideoElement>;
};

export const MenuBackgroundChrome = ({
  audioRef,
  children,
  isVideoPaused,
  musicVolume,
  setIsVideoPaused,
  setMusicVolume,
  setShowSettings,
  showSettings,
  videoRef,
}: MenuBackgroundChromeProps) => {
  const { t } = useTranslation();
  const settingsText = t('game.settings_title');
  const videoText = t('game.video_moving');

  return (
    <div className="App">
      <video ref={videoRef} className="menu-video-bg" autoPlay loop muted playsInline aria-label={videoText}>
        <source src={menuVideo} type="video/mp4" />
        <track kind="captions" src="/empty-captions.vtt" srcLang="en" label="No spoken audio" />
      </video>
      <div className="menu-video-overlay" />
      <audio ref={audioRef} className="bg-music" src={backgroundMusic} autoPlay loop>
        <track kind="captions" src="/empty-captions.vtt" srcLang="en" label="Background music" />
      </audio>

      {children}

      {showSettings && (
        <dialog className="modal-backdrop" open aria-modal="true" aria-label={settingsText}>
          <div className="modal-box">
            <h3>{settingsText}</h3>
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
              <label htmlFor="video-static">{videoText}</label>
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
        </dialog>
      )}
    </div>
  );
};
