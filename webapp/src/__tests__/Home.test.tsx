import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi, beforeEach } from 'vitest'
import HomeScreen from '../screens/HomeScreen'
import '@testing-library/jest-dom'

describe('Home', () => {
  beforeEach(() => {
    // 1. IMPORTANTE: Definimos la URL base para que el constructor new URL() no explote
    vi.stubEnv('VITE_API_URL', 'https://localhost:3000');
    
    // 2. Mockeamos location con una URL válida
    vi.stubGlobal('location', { 
      href: 'https://localhost/',
      origin: 'https://localhost',
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
    const loginBtn = screen.getByRole('button', { name: /iniciar sesión/i })
    const registerBtn = screen.getByRole('button', { name: /registrarse/i })
    const guestBtn = screen.getByRole('button', { name: /entrar como invitado/i })

    expect(loginBtn).toBeInTheDocument()
    expect(registerBtn).toBeInTheDocument()
    expect(guestBtn).toBeInTheDocument()
    expect(loginBtn.compareDocumentPosition(registerBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(registerBtn.compareDocumentPosition(guestBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(loginBtn).toHaveClass('home-auth-button')
    expect(registerBtn).toHaveClass('home-auth-button')
    expect(guestBtn).toHaveClass('home-guest-button')
  })

  test('los botones de invitado, registro y login llaman a sus funciones', async () => {
    const onLogin = vi.fn()
    const onRegister = vi.fn()
    const onGuest = vi.fn()

    render(
      <HomeScreen 
        username="" 
        onUsernameChange={vi.fn()} 
        onStart={onGuest} 
        onGoToRegister={onRegister} 
        onGoToLogin={onLogin} 
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /entrar como invitado/i }))
    expect(onGuest).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /registrarse/i }))
    expect(onRegister).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))
    expect(onLogin).toHaveBeenCalled()
  })

  test('muestra y ejecuta los accesos de ajustes y ayuda', async () => {
    const user = userEvent.setup()
    const onLanguage = vi.fn()
    const onSettings = vi.fn()
    const onTutorial = vi.fn()

    render(
      <HomeScreen
        username=""
        onUsernameChange={vi.fn()}
        onStart={vi.fn()}
        onGoToRegister={vi.fn()}
        onGoToLogin={vi.fn()}
        onOpenLanguage={onLanguage}
        onOpenSettings={onSettings}
        onOpenTutorial={onTutorial}
      />
    )

    const languageBtn = screen.getByRole('button', { name: /idioma/i })
    const settingsBtn = screen.getByRole('button', { name: /configuración de elementos de fondo/i })
    const tutorialBtn = screen.getByRole('button', { name: /abrir ayuda/i })

    expect(languageBtn.compareDocumentPosition(settingsBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(settingsBtn.compareDocumentPosition(tutorialBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    await user.click(languageBtn)
    await user.click(screen.getByRole('button', { name: /configuración de elementos de fondo/i }))
    await user.click(tutorialBtn)

    expect(onLanguage).toHaveBeenCalled()
    expect(onSettings).toHaveBeenCalled()
    expect(onTutorial).toHaveBeenCalled()
  })
})
