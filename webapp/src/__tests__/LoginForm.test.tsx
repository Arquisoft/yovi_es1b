import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginScreen from '../screens/LoginScreen'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'

describe('LoginForm', () => {
  beforeEach(() => {
    vi.stubGlobal('scrollTo', vi.fn())
    // Importante: Mockeamos window.location para verificar redirecciones
    vi.stubGlobal('location', { href: '' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  test('con datos incompletos no deja avanzar', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    
    render(<LoginScreen onBack={vi.fn()} onLogin={onLogin} />)

    // Solo escribimos usuario, falta contraseña
    await user.type(screen.getByLabelText(/usuario/i), 'Alice')
    await user.click(screen.getByRole('button', { name: /^iniciar sesion$/i }))

    // No debe haber llamado a la función de éxito ni cambiado de página
    expect(onLogin).not.toHaveBeenCalled()
  })

  test('con credenciales incorrectas muestra error', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Credenciales invalidas' }),
    } as Response)

    render(<LoginScreen onBack={vi.fn()} onLogin={vi.fn()} />)

    await user.type(screen.getByLabelText(/usuario/i), 'Alice')
    await user.type(screen.getByLabelText(/contra/i), 'bad-password')
    await user.click(screen.getByRole('button', { name: /^iniciar sesion$/i }))

    await waitFor(() => {
      expect(screen.getByText(/credenciales invalidas/i)).toBeInTheDocument()
    })
  })

  test('con éxito llama a onLogin', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    
    // 1. Actualizamos el mock para que devuelva lo que el nuevo Back envía
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ 
        username: 'Alice', 
        friendCode: 'XYZ789', // Simulamos un código de amigo
        icon: 'avatar.png'     // Simulamos un icono
      }),
    } as Response)

    render(<LoginScreen onBack={vi.fn()} onLogin={onLogin} />)

    await user.type(screen.getByLabelText(/usuario/i), 'Alice')
    await user.type(screen.getByLabelText(/contra/i), '12345')
    await user.click(screen.getByRole('button', { name: /^iniciar sesion$/i }))

    await waitFor(() => {
      // 2. Verificamos que se llame con los TRES argumentos correctos
      expect(onLogin).toHaveBeenCalledWith('Alice', 'XYZ789', 'avatar.png')
    })
  })

  test('el botón volver intenta regresar a index.html', async () => {
    const user = userEvent.setup()
    // En MPA, el botón volver suele ejecutar un window.location.href = 'index.html'
    // O llamar a una prop que lo hace. Verificamos la prop:
    const onBack = vi.fn(() => { window.location.href = '/index.html' })

    render(<LoginScreen onBack={onBack} onLogin={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /volver/i }))
    
    expect(onBack).toHaveBeenCalled()
    expect(window.location.href).toBe('/index.html')
  })
})
