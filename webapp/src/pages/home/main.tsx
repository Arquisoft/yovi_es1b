import { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom/client'
import HomeScreen from '../../screens/HomeScreen'
import '../../css/App.css'
import '../../css/Log.css'
import '../../index.css'
import menuVideo from '../../assets/background_video.mp4'
import backgroundMusic from '../../assets/background_music.mp3'

const HomeApp = () => {
  const [username, setUsername] = useState(localStorage.getItem('yovi_user') || '');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    localStorage.setItem('yovi_user', username);
  }, [username]);

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

  return (
    <div className="App">
      <video className="menu-video-bg" autoPlay loop muted playsInline>
        <source src={menuVideo} type="video/mp4"/>
      </video>
      <div className="menu-video-overlay"/>
      <audio ref={audioRef} className="bg-music" src={backgroundMusic} autoPlay loop />

      <HomeScreen 
        username={username} 
        onUsernameChange={setUsername} 
        onStart={() => window.location.href = '/game.html'} 
        onGoToRegister={() => window.location.href = '/register.html'} 
        onGoToLogin={() => window.location.href = '/login.html'} 
      />
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<HomeApp />)
