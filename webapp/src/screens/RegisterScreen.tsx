import { type FormEvent, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const languageModules = import.meta.glob('../assets/language/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const getLanguageIcon = (token: string): string | null => {
  const entry = Object.entries(languageModules).find(([path]) => path.toLowerCase().includes(token.toLowerCase()));
  return entry ? entry[1] : null;
};

const countryOptions = [
  { value: 'Spain', icon: getLanguageIcon('espana') },
  { value: 'United Kingdom', icon: getLanguageIcon('reino-unido') },
  { value: 'German', icon: getLanguageIcon('alemania') },
  { value: 'Portuguese', icon: getLanguageIcon('portugal') },
];

const iconModules = import.meta.glob('../assets/icon/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const availableIcons = Object.entries(iconModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, src], index) => ({
    id: `${index}-${path.split('/').pop() ?? 'icon'}`,
    src,
    name: path.split('/').pop() ?? `Icono ${index + 1}`,
  }));

const noAvatarIcon = availableIcons.find((icon) => icon.name.toLowerCase().includes('sinavatar'));
const maleIcons = availableIcons.filter((icon) => icon.name.toLowerCase().includes('hombre')).slice(0, 4);
const femaleIcons = availableIcons.filter((icon) => icon.name.toLowerCase().includes('mujer')).slice(0, 4);

interface RegisterData {
  name: string;
  age: string;
  birthDate: string;
  country: string;
  password: string;
  confirmPassword: string;
}

interface RegisterScreenProps {
  readonly onBack: () => void;
  readonly onCreateAccount: (name: string, friendCode: string, icon?: string | null) => Promise<void> | void;
}

function RegisterScreen({ onBack, onCreateAccount }: Readonly<RegisterScreenProps>) {
  const [formData, setFormData] = useState<RegisterData>({
    name: '',
    age: '',
    birthDate: '',
    country: '',
    password: '',
    confirmPassword: '',
  });

  const [ageError, setAgeError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(noAvatarIcon?.src ?? availableIcons[0]?.src ?? null);

  const handleChange = (field: keyof RegisterData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.name.trim() || !formData.country.trim() || !formData.password.trim() || !formData.confirmPassword.trim() || !formData.birthDate) {
      setFormError('Nombre, pais, fecha de nacimiento, contrasena y confirmacion no pueden estar en blanco.');
      return;
    }
    setFormError(null);

    if (formData.password !== formData.confirmPassword) {
      setPasswordError('La confirmacion de contrasena no coincide.');
      return;
    }
    setPasswordError(null);

    const age = Number(formData.age);
    if (!Number.isFinite(age) || age < 3 || age > 100) {
      setAgeError('La edad debe estar entre 3 y 100 anos.');
      return;
    }
    setAgeError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/createuser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.name.trim(),
          password: formData.password.trim(),
          age,
          birthDate: formData.birthDate,
          country: formData.country.trim(),
          icon: selectedIcon,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await onCreateAccount(formData.name.trim(), data.friendCode, selectedIcon);
      } else {
        setFormError(data.error || 'Error al crear la cuenta.');
      }
    } catch (error) {
      setFormError('Error de red al crear la cuenta.');
    }
  };

  return (
    <div className="register-screen">
      <h2 className="title-log">ZONA DE REGISTRO</h2>

      <form className="choose-option menu-content" onSubmit={handleSubmit}>
        {formError && <small className="error-message">{formError}</small>}
        {passwordError && <small className="error-message">{passwordError}</small>}

        <div className="register-form-layout">
          <div className="register-left-zone">
            <div className="form-group">
              <label htmlFor="register-name">Nombre</label>
              <input
                id="register-name"
                className="form-input"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="register-age">Edad</label>
              <input
                id="register-age"
                className="form-input"
                type="number"
                min="3"
                max="100"
                value={formData.age}
                onChange={(e) => handleChange('age', e.target.value)}
                required
              />
              {ageError && (
                <small className="error-message">{ageError}</small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="register-birth-date">Fecha de nacimiento</label>
              <input
                id="register-birth-date"
                className="form-input"
                type="date"
                value={formData.birthDate}
                onChange={(e) => handleChange('birthDate', e.target.value)}
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

            <div className="form-group">
              <label htmlFor="register-confirm-password">Confirmar contrasena</label>
              <input
                id="register-confirm-password"
                className="form-input"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="register-right-zone">
            <div className="form-group">
              <label>Pais</label>
              <div className="country-checkbox-box" role="group" aria-label="Seleccion de pais">
                {countryOptions.map((option) => {
                  const checked = formData.country === option.value;
                  return (
                    <label key={option.value} className="country-checkbox-item">
                      <span className="country-checkbox-left">
                        {option.icon ? (
                          <img src={option.icon} alt={option.value} className="country-flag-icon" />
                        ) : (
                          <span className="country-flag-fallback" aria-hidden="true" />
                        )}
                        <span>{option.value}</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => handleChange('country', e.target.checked ? option.value : '')}
                        aria-label={`Seleccionar ${option.value}`}
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label>Elige tu icono</label>
              <div className="icon-picker-box" role="group" aria-label="Selector de iconos">
                {availableIcons.length === 0 ? (
                  <small className="error-message">Anade iconos en `webapp/src/assets/icon` para poder elegir uno.</small>
                ) : (
                  <>
                    {noAvatarIcon && (
                      <>
                        <div className="icon-row-label">Sin Avatar</div>
                        <div className="icon-row-grid icon-row-grid-single">
                          <button
                            type="button"
                            className={`icon-option ${selectedIcon === noAvatarIcon.src ? 'icon-option-selected' : ''}`}
                            onClick={() => setSelectedIcon(noAvatarIcon.src)}
                            title="Sin Avatar"
                            aria-label="Elegir Sin Avatar"
                            aria-pressed={selectedIcon === noAvatarIcon.src}
                          >
                            <img src={noAvatarIcon.src} alt="Sin Avatar" className="icon-option-img" />
                          </button>
                        </div>
                      </>
                    )}

                    <div className="icon-row-label">Hombre</div>
                    <div className="icon-row-grid">
                      {maleIcons.map((icon) => {
                        const isSelected = selectedIcon === icon.src;
                        return (
                          <button
                            key={icon.id}
                            type="button"
                            className={`icon-option ${isSelected ? 'icon-option-selected' : ''}`}
                            onClick={() => setSelectedIcon(icon.src)}
                            title={icon.name}
                            aria-label={`Elegir ${icon.name}`}
                            aria-pressed={isSelected}
                          >
                            <img src={icon.src} alt={icon.name} className="icon-option-img" />
                          </button>
                        );
                      })}
                    </div>

                    <div className="icon-row-label">Mujer</div>
                    <div className="icon-row-grid">
                      {femaleIcons.map((icon) => {
                        const isSelected = selectedIcon === icon.src;
                        return (
                          <button
                            key={icon.id}
                            type="button"
                            className={`icon-option ${isSelected ? 'icon-option-selected' : ''}`}
                            onClick={() => setSelectedIcon(icon.src)}
                            title={icon.name}
                            aria-label={`Elegir ${icon.name}`}
                            aria-pressed={isSelected}
                          >
                            <img src={icon.src} alt={icon.name} className="icon-option-img" />
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="register-actions">
          <button type="submit" className="submit-button">
            Crear cuenta
          </button>

          <button type="button" className="submit-button" onClick={onBack}>
            Volver
          </button>
        </div>
      </form>
    </div>
  );
}

export default RegisterScreen;
