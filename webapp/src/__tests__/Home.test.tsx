import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, test, vi, beforeEach } from 'vitest'
import HomeScreen from '../screens/HomeScreen' // Importamos el Screen, no la App
import '@testing-library/jest-dom'

describe('Home', () => {
  // Mockeamos window.location para que no falle al intentar cambiar de página
  beforeEach(() => {
    vi.stubGlobal('location', { href: '' });
    vi.stubGlobal('scrollTo', vi.fn());
  })

  test('muestra la pantalla home con accesos de registro y login', () => {
    // Ya no necesitamos MemoryRouter ni App
    render(
      <HomeScreen 
        username="" 
        onUsernameChange={vi.fn()} 
        onStart={vi.fn()} 
        onGoToRegister={vi.fn()} 
        onGoToLogin={vi.fn()} 
      />
    )

    expect(screen.getByRole('heading', { name: /bienvenido a 'y'/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /registrarse/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /iniciar sesion/i })).toBeInTheDocument()
  })

  test('los botones de registro y login llaman a sus funciones', async () => {
    const onLogin = vi.fn()
    const onRegister = vi.fn()

    render(
      <HomeScreen 
        username="" 
        onUsernameChange={vi.fn()} 
        onStart={vi.fn()} 
        onGoToRegister={onRegister} 
        onGoToLogin={onLogin} 
      />
    )

    // Simulamos clic en registro
    fireEvent.click(screen.getByRole('button', { name: /registrarse/i }))
    expect(onRegister).toHaveBeenCalled()

    // Simulamos clic en login
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesion/i }))
    expect(onLogin).toHaveBeenCalled()
  })
})