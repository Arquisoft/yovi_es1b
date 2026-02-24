import { type FormEvent, useState } from 'react';

interface RegisterData {
  name: string;
  age: string;
  country: string;
  password: string;
}

interface RegisterScreenProps {
  onBack: () => void; // Vuelve a la pantalla anterior
  onCreateAccount: (name: string) => Promise<void> | void; // Inicia el flujo de crear cuenta/juego
}

function RegisterScreen({ onBack, onCreateAccount }: RegisterScreenProps) {
  const [formData, setFormData] = useState<RegisterData>({
    name: '',
    age: '',
    country: '',
    password: '',
  });

  const [ageError, setAgeError] = useState<string | null>(null); // Error de validacion de edad
  const [formError, setFormError] = useState<string | null>(null); // Error general (campos vacios)

  const handleChange = (field: keyof RegisterData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value })); // Actualiza solo el campo editado
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Evita recargar la pagina al enviar el formulario

    // Bloquea envio si nombre, pais o contrasena son solo espacios
    if (!formData.name.trim() || !formData.country.trim() || !formData.password.trim()) {
      setFormError('Nombre, pais y contrasena no pueden estar en blanco.');
      return;
    }
    setFormError(null); // Limpia error general si pasa la validacion

    const age = Number(formData.age);
    // Valida edad en el rango permitido
    if (!Number.isFinite(age) || age < 3 || age > 100) {
      setAgeError('La edad debe estar entre 3 y 100 anos.');
      return;
    }
    setAgeError(null); // Limpia error de edad si pasa la validacion

    // Si todo es valido, delega en App.tsx para continuar el flujo
    await onCreateAccount(formData.name.trim());
  };

  return (
    <div className="home-screen">
      <h2 className="welcome-title">ZONA DE REGISTRO</h2>

      {/* Formulario principal de registro */}
      <form className="choose-option menu-content" onSubmit={handleSubmit}>
        {formError && <small className="error-message">{formError}</small>}

        <div className="form-group">
          <label htmlFor="register-name">Nombre</label>
          <input
            id="register-name"
            className="form-input"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required // Validacion HTML nativa
          />
        </div>

        <div className="form-group">
          <label htmlFor="register-age">Edad</label>
          <input
            id="register-age"
            className="form-input"
            type="number"
            min="3" // Limite inferior en el input
            max="100" // Limite superior en el input
            value={formData.age}
            onChange={(e) => handleChange('age', e.target.value)}
            required
          />
          {ageError && (
            <small className="error-message">{ageError}</small>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="register-country">Pais</label>
          <input
            id="register-country"
            className="form-input"
            type="text"
            value={formData.country}
            onChange={(e) => handleChange('country', e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="register-password">Contrasena</label>
          <input
            id="register-password"
            className="form-input"
            type="password"
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            required
          />
        </div>

        <button type="submit" className="submit-button">
          Crear cuenta
        </button>

        {/* Boton de navegacion, no envia el formulario */}
        <button type="button" className="submit-button" onClick={onBack}>
          Volver
        </button>
      </form>
    </div>
  );
}

export default RegisterScreen;
