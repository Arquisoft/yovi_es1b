import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginScreen from '../screens/LoginScreen'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'

describe('LoginForm', () => {
  beforeEach(() => {
    vi.stubGlobal('scrollTo', vi.fn())
    vi.stubGlobal('location', { href: '' })
    sessionStorage.clear()
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  test('con datos incompletos no deja avanzar y muestra error de validacion', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    const fetchSpy = vi.fn()
    global.fetch = fetchSpy as unknown as typeof fetch

    render(<LoginScreen onBack={vi.fn()} onLogin={onLogin} />)

    await act(async () => {
      await user.type(screen.getByLabelText(/nombre de usuario/i), 'Alice')
      await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))
    })

    expect(onLogin).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  test('valida usuario en blanco aunque haya contraseña', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    const fetchSpy = vi.fn()
    global.fetch = fetchSpy as unknown as typeof fetch

    render(<LoginScreen onBack={vi.fn()} onLogin={onLogin} />)

    await act(async () => {
      await user.type(screen.getByLabelText(/nombre de usuario/i), '   ')
      await user.type(screen.getByLabelText(/contraseña/i), '12345')
      await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))
    })

    expect(await screen.findByText(/usuario y contraseña no pueden estar en blanco/i)).toBeInTheDocument()
    expect(onLogin).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  test('valida contraseña en blanco aunque haya usuario', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    const fetchSpy = vi.fn()
    global.fetch = fetchSpy as unknown as typeof fetch

    render(<LoginScreen onBack={vi.fn()} onLogin={onLogin} />)

    await act(async () => {
      await user.type(screen.getByLabelText(/nombre de usuario/i), 'Alice')
      await user.type(screen.getByLabelText(/contraseña/i), '   ')
      await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))
    })

    expect(await screen.findByText(/usuario y contraseña no pueden estar en blanco/i)).toBeInTheDocument()
    expect(onLogin).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  test('con credenciales incorrectas muestra error del backend', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Credenciales invalidas' }),
    } as Response)

    render(<LoginScreen onBack={vi.fn()} onLogin={vi.fn()} />)

    await act(async () => {
      await user.type(screen.getByLabelText(/nombre de usuario/i), 'Alice')
      await user.type(screen.getByLabelText(/contraseña/i), 'bad-password')
      await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))
    })

    expect(await screen.findByText(/credenciales invalidas/i)).toBeInTheDocument()
  })

  test('si backend responde ok=false sin error usa mensaje por defecto', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response)

    render(<LoginScreen onBack={vi.fn()} onLogin={vi.fn()} />)

    await act(async () => {
      await user.type(screen.getByLabelText(/nombre de usuario/i), 'Alice')
      await user.type(screen.getByLabelText(/contraseña/i), '12345')
      await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))
    })

    expect(await screen.findByText(/error al iniciar sesión/i)).toBeInTheDocument()
  })

  test('con exito guarda token/username y llama a onLogin con iconName', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        token: 'token-123',
        username: 'AliceServer',
        friendCode: 'XYZ789',
        iconName: 'avatar1.png',
        nickname: 'Ali',
        language: 'Spain',
      }),
    } as Response)

    render(<LoginScreen onBack={vi.fn()} onLogin={onLogin} />)

    await act(async () => {
      await user.type(screen.getByLabelText(/nombre de usuario/i), 'AliceClient')
      await user.type(screen.getByLabelText(/contraseña/i), '12345')
      await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))
    })

    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith('AliceServer', 'XYZ789', 'avatar1.png', 'Ali', 'Spain')
    })

    expect(sessionStorage.getItem('token')).toBe('token-123')
    expect(sessionStorage.getItem('username')).toBe('AliceServer')
  })

  test('con exito sin token usa username del formulario y fallback de icon', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        friendCode: 'ABC111',
        icon: 'avatar-fallback.png',
        nickname: 123,
        language: null,
      }),
    } as Response)

    render(<LoginScreen onBack={vi.fn()} onLogin={onLogin} />)

    await act(async () => {
      await user.type(screen.getByLabelText(/nombre de usuario/i), 'AliceClient')
      await user.type(screen.getByLabelText(/contraseña/i), '12345')
      await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))
    })

    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith('AliceClient', 'ABC111', 'avatar-fallback.png', null, null)
    })

    expect(sessionStorage.getItem('token')).toBeNull()
    expect(sessionStorage.getItem('username')).toBe('AliceClient')
  })

  test('si fetch lanza excepcion muestra error de conexion', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'))

    render(<LoginScreen onBack={vi.fn()} onLogin={vi.fn()} />)

    await act(async () => {
      await user.type(screen.getByLabelText(/nombre de usuario/i), 'Alice')
      await user.type(screen.getByLabelText(/contraseña/i), '12345')
      await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))
    })

    expect(await screen.findByText(/error de conexión al iniciar sesión/i)).toBeInTheDocument()
  })

  test('finally vuelve a habilitar boton tras completar request', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()

    let resolveFetch: (value: Response) => void = () => {}
    global.fetch = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve
        })
    )

    render(<LoginScreen onBack={vi.fn()} onLogin={onLogin} />)

    await act(async () => {
      await user.type(screen.getByLabelText(/nombre de usuario/i), 'Alice')
      await user.type(screen.getByLabelText(/contraseña/i), '12345')
      await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))
    })

    expect(screen.getByRole('button', { name: /cargando/i })).toBeDisabled()

    resolveFetch({
      ok: true,
      json: async () => ({ friendCode: 'OK1', username: 'Alice' }),
    } as Response)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /iniciar sesión/i })).not.toBeDisabled()
      expect(onLogin).toHaveBeenCalled()
    })
  })

  test('el boton volver intenta regresar a index.html', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn(() => {
      window.location.href = '/index.html'
    })

    render(<LoginScreen onBack={onBack} onLogin={vi.fn()} />)

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /volver/i }))
    })

    expect(onBack).toHaveBeenCalled()
  })

  test('el boton volver usa el estilo de cancelacion rojo', () => {
    render(<LoginScreen onBack={vi.fn()} onLogin={vi.fn()} />)

    expect(screen.getByRole('button', { name: /volver/i })).toHaveClass('cancel-button')
  })

  test('muestra el enlace para crear cuenta y ejecuta onRegister', async () => {
    const user = userEvent.setup()
    const onRegister = vi.fn()

    render(<LoginScreen onBack={vi.fn()} onRegister={onRegister} onLogin={vi.fn()} />)

    const registerLink = screen.getByRole('button', { name: /no tengo cuenta, crear una/i })
    expect(registerLink).toHaveClass('login-register-link')

    await act(async () => {
      await user.click(registerLink)
    })

    expect(onRegister).toHaveBeenCalled()
  })

  test('muestra y ejecuta los accesos de ajustes y ayuda', async () => {
    const user = userEvent.setup()
    const onSettings = vi.fn()
    const onTutorial = vi.fn()

    render(
      <LoginScreen
        onBack={vi.fn()}
        onLogin={vi.fn()}
        onOpenSettings={onSettings}
        onOpenTutorial={onTutorial}
      />
    )

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /configuración/i }))
      await user.click(screen.getByRole('button', { name: /ayuda/i }))
    })

    expect(onSettings).toHaveBeenCalled()
    expect(onTutorial).toHaveBeenCalled()
  })
})
