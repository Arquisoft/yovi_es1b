import '../../i18n'
import React, { useEffect, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import LoginScreen from '../../screens/LoginScreen'
import '../../css/App.css'
import '../../css/Log.css'
import '../../index.css'
import menuVideo from '../../assets/background_video.mp4'
import backgroundMusic from '../../assets/background_music.mp3'

const LoginPage = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.4;
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const storedTime = Number(localStorage.getItem('yovi_bg_time') || '0');
    if (!Number.isNaN(storedTime) && storedTime > 0) {
      const applyTime = () => {
        audio.currentTime = Math.min(storedTime, Math.max(0, audio.duration || storedTime));
      };
      if (audio.readyState >= 1) {
        applyTime();
      } else {
        audio.addEventListener('loadedmetadata', applyTime, { once: true });
      }
    }

    const saveTime = () => {
      localStorage.setItem('yovi_bg_time', String(audio.currentTime || 0));
    };
    const intervalId = window.setInterval(saveTime, 1000);
    window.addEventListener('beforeunload', saveTime);
    document.addEventListener('visibilitychange', saveTime);

    return () => {
      saveTime();
      window.clearInterval(intervalId);
      window.removeEventListener('beforeunload', saveTime);
      document.removeEventListener('visibilitychange', saveTime);
    };
  }, []);
  const handleLoginSuccess = (
    playerName: string,
    friendCode: string,
    icon?: string | null,
    nickname?: string | null,
    language?: string | null
  ) => {
    const name = playerName.trim();
    if (!name) return;

    // Guardamos en persistencia para que la página de juego lo reconozca
    localStorage.setItem('yovi_user', name);
    localStorage.setItem('yovi_friend_code', friendCode);
    if (typeof icon === 'string' && icon.trim()) {
      localStorage.setItem('yovi_user_icon', icon);
    } else {
      localStorage.removeItem('yovi_user_icon');
    }
    if (typeof nickname === 'string' && nickname.trim()) {
      localStorage.setItem('yovi_user_nickname', nickname.trim());
    } else {
      localStorage.removeItem('yovi_user_nickname');
    }
    if (typeof language === 'string' && language.trim()) {
      localStorage.setItem('yovi_user_language', language.trim());
    } else {
      localStorage.removeItem('yovi_user_language');
    }
    
    // Redirección real de navegador (MPA)
    window.location.href = '/game.html';
  };

  const handleBack = () => {
    window.location.href = '/index.html';
  };

  return (
    <div className="App">
      {/* Mantenemos el fondo de video para la estética del sitio */}
      <video className="menu-video-bg" autoPlay loop muted playsInline>
        <source src={menuVideo} type="video/mp4"/>
      </video>
      <div className="menu-video-overlay"/>
      <audio ref={audioRef} className="bg-music" src={backgroundMusic} autoPlay loop />

      <LoginScreen 
        onBack={handleBack} 
        onLogin={handleLoginSuccess} 
      />
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LoginPage />
  </React.StrictMode>
)
