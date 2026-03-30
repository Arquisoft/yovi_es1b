import { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import HomeScreen from '../../screens/HomeScreen'
import '../../css/App.css'
import menuVideo from '../../assets/background_video.mp4'

const HomeApp = () => {
  const [username, setUsername] = useState(localStorage.getItem('yovi_user') || '');

  useEffect(() => {
    localStorage.setItem('yovi_user', username);
  }, [username]);

  return (
    <div className="App">
      <video className="menu-video-bg" autoPlay loop muted playsInline>
        <source src={menuVideo} type="video/mp4"/>
      </video>
      <div className="menu-video-overlay"/>

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