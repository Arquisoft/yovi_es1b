import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import LoginScreen from '../screens/LoginScreen'
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'

describe('LoginForm', () => {
  beforeAll(() => {
    vi.stubGlobal('scrollTo', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('con datos incompletos no deja avanzar', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    global.fetch = fetchMock as unknown as typeof fetch

    render(<App />)

    await user.click(screen.getByRole('button', { name: /iniciar sesion/i }))
    await user.type(await screen.findByLabelText(/usuario/i), 'Alice')
    await user.click(screen.getByRole('button', { name: /^iniciar sesion$/i }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: /recuerdame/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /jugador:/i })).not.toBeInTheDocument()
  })

  test('con credenciales incorrectas no deja avanzar', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Credenciales invalidas' }),
    } as Response)

    render(<App />)

    await user.click(screen.getByRole('button', { name: /iniciar sesion/i }))
    await user.type(await screen.findByLabelText(/usuario/i), 'Alice')
    await user.type(screen.getByLabelText(/contra/i), 'bad-password')
    await user.click(screen.getByRole('button', { name: /^iniciar sesion$/i }))

    await waitFor(() => {
      expect(screen.getByText(/credenciales invalidas/i)).toBeInTheDocument()
    })
    expect(screen.queryByRole('heading', { name: /jugador:/i })).not.toBeInTheDocument()
  })

  test('no permite login de usuario inexistente', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Ese usuario no existe en la base de datos' }),
    } as Response)

    render(<App />)

    await user.click(screen.getByRole('button', { name: /iniciar sesion/i }))
    await user.type(await screen.findByLabelText(/usuario/i), 'UsuarioQueNoExiste')
    await user.type(screen.getByLabelText(/contra/i), 'pass1234')
    await user.click(screen.getByRole('button', { name: /^iniciar sesion$/i }))

    await waitFor(() => {
      expect(screen.getByText(/ese usuario no existe en la base de datos/i)).toBeInTheDocument()
    })
    expect(screen.queryByRole('heading', { name: /jugador:/i })).not.toBeInTheDocument()
  })

  test('registra usuario nuevo y luego permite login con ese usuario', async () => {
    const user = userEvent.setup()
    const username = 'NuevoUsuario'
    const password = 'pass1234'

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ responseFromRust: { size: 5, turn: 0, players: [], layout: '././././.' } }),
      } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ responseFromRust: { size: 5, turn: 0, players: [], layout: '././././.' } }),
      } as Response)

    render(<App />)

    await user.click(screen.getByRole('button', { name: /registrarse/i }))
    await user.type(await screen.findByLabelText(/nombre/i), username)
    await user.type(screen.getByLabelText(/edad/i), '22')
    await user.type(screen.getByLabelText(/pa/i), 'Spain')
    await user.type(screen.getByLabelText(/contra/i), password)
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => {
      expect(screen.getByText(new RegExp(`jugador: ${username}`, 'i'))).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /salir/i }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /bienvenido a 'y'/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /iniciar sesion/i }))
    await user.type(await screen.findByLabelText(/usuario/i), username)
    await user.type(screen.getByLabelText(/contra/i), password)
    await user.click(screen.getByRole('button', { name: /^iniciar sesion$/i }))

    await waitFor(() => {
      expect(screen.getByText(new RegExp(`jugador: ${username}`, 'i'))).toBeInTheDocument()
    })
  })

  test('desde login inicia partida y permite mover una celda', async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ responseFromRust: { size: 5, turn: 0, players: [], layout: '././././.' } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          responseFromRust: { size: 6, turn: 0, players: [], layout: './../.../..../...../......' },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          responseFromRust: { size: 6, turn: 1, players: [], layout: 'B/../.../..../...../......' },
          winner: null,
        }),
      } as Response)

    render(<App />)

    await user.click(screen.getByRole('button', { name: /iniciar sesion/i }))
    await user.type(await screen.findByLabelText(/usuario/i), 'JugadorPrueba')
    await user.type(screen.getByLabelText(/contra/i), 'password123')
    await user.click(screen.getByRole('button', { name: /^iniciar sesion$/i }))

    await waitFor(() => {
      expect(screen.getByText(/jugador: jugadorprueba/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /^facil$/i }))
    await user.click(await screen.findByRole('button', { name: /6x6x6/i }))
    await user.click(screen.getByRole('button', { name: /celda 0/i }))

    await waitFor(() => {
      expect(screen.getByText(/movimiento realizado!/i)).toBeInTheDocument()
    })
  })

  test.each([
    { field: 'usuario', username: 'JugadorValido', password: 'password123' },
    { field: 'contrasena', username: 'JugadorValido', password: 'ClaveSegura99' },
  ])('campo valido de $field permite enviar el login', async ({ username, password }) => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    const onBack = vi.fn()

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response)

    render(<LoginScreen onBack={onBack} onLogin={onLogin} />)

    await user.type(screen.getByLabelText(/usuario/i), username)
    await user.type(screen.getByLabelText(/contra/i), password)
    await user.click(screen.getByRole('button', { name: /^iniciar sesion$/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(onLogin).toHaveBeenCalledWith(username)
    })
  })
})
