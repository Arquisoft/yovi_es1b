import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterScreen from '../screens/RegisterScreen'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.stubGlobal('scrollTo', vi.fn())
    // Mockeamos location para verificar que intente navegar
    vi.stubGlobal('location', { href: '' })
    
    // Mock de fetch base
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  test('con datos incompletos no deja avanzar', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    
    render(<RegisterScreen onBack={vi.fn()} onCreateAccount={onCreate} />)

    // Solo llenamos nombre y edad, faltan país y contraseña
    await user.type(screen.getByLabelText(/nombre/i), 'Alice')
    await user.type(screen.getByLabelText(/edad/i), '22')
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

    // No debe llamar a la función de creación ni a fetch si el formulario es inválido (HTML5 validation)
    expect(onCreate).not.toHaveBeenCalled()
  })

  test('con edad no permitida el navegador marca error', async () => {
    const user = userEvent.setup()
    render(<RegisterScreen onBack={vi.fn()} onCreateAccount={vi.fn()} />)

    const edadInput = screen.getByLabelText(/edad/i) as HTMLInputElement
    await user.type(edadInput, '2') // Edad muy baja
    
    // En pruebas de JSDOM, verificamos la validez del input
    expect(edadInput.checkValidity()).toBe(false)
  })

  test('si el backend rechaza muestra el mensaje de error', async () => {
    const user = userEvent.setup()
    
    // Simulamos error de "Usuario ya existe"
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Usuario ya existe' }),
    } as Response)

    render(<RegisterScreen onBack={vi.fn()} onCreateAccount={vi.fn()} />)

    await user.type(screen.getByLabelText(/nombre/i), 'Alice')
    await user.type(screen.getByLabelText(/edad/i), '22')
    await user.type(screen.getByLabelText(/pa/i), 'Spain')
    await user.type(screen.getByLabelText(/contra/i), 'password123')
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => {
      expect(screen.getByText(/usuario ya existe/i)).toBeInTheDocument()
    })
  })

  test('un registro exitoso llama a onCreateAccount', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response)

    render(<RegisterScreen onBack={vi.fn()} onCreateAccount={onCreate} />)

    await user.type(screen.getByLabelText(/nombre/i), 'Alice')
    await user.type(screen.getByLabelText(/edad/i), '25')
    await user.type(screen.getByLabelText(/pa/i), 'Spain')
    await user.type(screen.getByLabelText(/contra/i), 'securePass123')
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith('Alice')
    })
  })

  test('el botón volver ejecuta la función onBack', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()

    render(<RegisterScreen onBack={onBack} onCreateAccount={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /volver/i }))
    expect(onBack).toHaveBeenCalled()
  })
})