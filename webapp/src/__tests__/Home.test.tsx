import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, test, vi, beforeEach } from 'vitest'
import HomeScreen from '../screens/HomeScreen'
import '@testing-library/jest-dom'

describe('Home', () => {
  beforeEach(() => {
    // 1. IMPORTANTE: Definimos la URL base para que el constructor new URL() no explote
    vi.stubEnv('VITE_API_URL', 'http://localhost:3000');
    
    // 2. Mockeamos location con una URL válida
    vi.stubGlobal('location', { 
      href: 'http://localhost/',
      origin: 'http://localhost',
      pathname: '/'
    });
    
    vi.stubGlobal('scrollTo', vi.fn());
    
    // Limpiamos mocks previos
    vi.clearAllMocks();
  })

  test('muestra la pantalla home con accesos de registro y login', () => {
    render(
      <HomeScreen 
        username="" 
        onUsernameChange={vi.fn()} 
        onStart={vi.fn()} 
        onGoToRegister={vi.fn()} 
        onGoToLogin={vi.fn()} 
      />
    )

    // Ajustado para que coincida con el texto real
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole('button', { name: /registrarse/i }))
    expect(onRegister).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /iniciar sesion/i }))
    expect(onLogin).toHaveBeenCalled()
  })
})