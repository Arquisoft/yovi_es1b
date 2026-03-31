import React from 'react'
import ReactDOM from 'react-dom/client'
import LoginScreen from '../../screens/LoginScreen'
import '../../css/App.css'
import '../../css/Log.css'
import '../../index.css'
import menuVideo from '../../assets/background_video.mp4'

const LoginPage = () => {
  const handleLoginSuccess = (playerName: string, icon?: string | null) => {
    const name = playerName.trim();
    if (!name) return;

    // Guardamos en persistencia para que la página de juego lo reconozca
    localStorage.setItem('yovi_user', name);
    if (typeof icon === 'string' && icon.trim()) {
      localStorage.setItem('yovi_user_icon', icon);
    } else {
      localStorage.removeItem('yovi_user_icon');
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
