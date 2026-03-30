import React from 'react'
import ReactDOM from 'react-dom/client'
import RegisterScreen from '../../screens/RegisterScreen'
import '../../css/App.css'
import '../../css/Log.css'
import menuVideo from '../../assets/background_video.mp4'

const RegisterPage = () => {
  const handleRegisterSuccess = (playerName: string) => {
    const name = playerName.trim();
    if (!name) return;

    localStorage.setItem('yovi_user', name);
    window.location.href = '/game.html';
  };

  const handleBack = () => {
    window.location.href = '/index.html';
  };

  return (
    <div className="App">
      <video className="menu-video-bg" autoPlay loop muted playsInline>
        <source src={menuVideo} type="video/mp4"/>
      </video>
      <div className="menu-video-overlay"/>

      <RegisterScreen 
        onBack={handleBack} 
        onCreateAccount={handleRegisterSuccess} 
      />
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RegisterPage />
  </React.StrictMode>
)