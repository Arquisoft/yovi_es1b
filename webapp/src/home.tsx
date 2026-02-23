import React from 'react';

interface HomeProps {
  onGoToRegister: () => void;
  onGoToLogin: () => void;
}

const RegisterForm: React.FC<HomeProps> = ({ onGoToRegister, onGoToLogin }) => {

  return (
    <div className="choose-option menu-content">
      <h3>
        Seleccione una forma de registro
      </h3>

      <button
        type="button"
        className="submit-button"
        onClick={onGoToRegister}
      >
        Registrarse
      </button>

      <button
        type="button"
        className="submit-button"
        onClick={onGoToLogin}
      >
        Iniciar sesion
      </button>
    </div>
  );
};

export default RegisterForm;
