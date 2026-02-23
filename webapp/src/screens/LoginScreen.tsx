import { type FormEvent, useState } from 'react';

interface LoginData {
  username: string;
  password: string;
}

interface LoginScreenProps {
  onBack: () => void; // Vuelve a pantalla anterior
  onLogin: (username: string) => Promise<void> | void; // Intenta iniciar partida con ese usuario
}

function LoginScreen({ onBack, onLogin }: LoginScreenProps) {
  const [formData, setFormData] = useState<LoginData>({
    username: '',
    password: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Evita recargar la pagina
    if (!formData.username.trim() || !formData.password.trim()) {
      setFormError('Usuario y contrasena no pueden estar en blanco.'); // Valida campos obligatorios
      return;
    }
    setFormError(null);

    await onLogin(formData.username.trim()); // Delega en App.tsx el arranque de partida
  };

  return (
    <div className="home-screen">
      <h2 className="welcome-title">RECUERDAME QUIEN ERES</h2>
      <form className="choose-option menu-content" onSubmit={handleSubmit}>
        {formError && <small className="error-message">{formError}</small>}

        <div className="form-group">
          <label htmlFor="login-username">Nombre de usuario</label>
          <input
            id="login-username"
            className="form-input"
            type="text"
            value={formData.username}
            onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="login-password">Contrasena</label>
          <input
            id="login-password"
            className="form-input"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
            required
          />
        </div>

        <button type="submit" className="submit-button">
          Iniciar sesion
        </button>
        <button type="button" className="submit-button" onClick={onBack}> {/* No envia formulario */}
          Volver
        </button>
      </form>
    </div>
  );
}

export default LoginScreen;
