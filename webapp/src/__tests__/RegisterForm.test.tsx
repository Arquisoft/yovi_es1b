import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import RegisterScreen from '../screens/RegisterScreen'
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'

describe('RegisterForm', () => {
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

    await user.click(screen.getByRole('button', { name: /registrarse/i }))
    await user.type(await screen.findByLabelText(/nombre/i), 'Alice')
    await user.type(screen.getByLabelText(/edad/i), '22')
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: /zona de registro/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /jugador:/i })).not.toBeInTheDocument()
  })

  test('con edad no permitida no deja registrarse', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    global.fetch = fetchMock as unknown as typeof fetch

    render(<App />)

    await user.click(screen.getByRole('button', { name: /registrarse/i }))
    await user.type(await screen.findByLabelText(/nombre/i), 'Alice')
    await user.type(screen.getByLabelText(/edad/i), '2')
    await user.type(screen.getByLabelText(/pa/i), 'Spain')
    await user.type(screen.getByLabelText(/contra/i), 'password123')
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/edad/i)).toBeInvalid()
    expect(screen.getByRole('heading', { name: /zona de registro/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /jugador:/i })).not.toBeInTheDocument()
  })

  test('si el backend rechaza no deja avanzar', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Usuario ya existe' }),
    } as Response)

    render(<App />)

    await user.click(screen.getByRole('button', { name: /registrarse/i }))
    await user.type(await screen.findByLabelText(/nombre/i), 'Alice')
    await user.type(screen.getByLabelText(/edad/i), '22')
    await user.type(screen.getByLabelText(/pa/i), 'Spain')
    await user.type(screen.getByLabelText(/contra/i), 'password123')
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => {
      expect(screen.getByText(/usuario ya existe/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('heading', { name: /zona de registro/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /jugador:/i })).not.toBeInTheDocument()
  })

  test.each([
    { field: 'nombre', name: 'Alice', age: '22', country: 'Spain', password: 'password123' },
    { field: 'edad', name: 'Alice', age: '30', country: 'Spain', password: 'password123' },
    { field: 'pais', name: 'Alice', age: '22', country: 'Argentina', password: 'password123' },
    { field: 'contrasena', name: 'Alice', age: '22', country: 'Spain', password: 'ClaveSegura99' },
  ])('campo valido de $field permite enviar el registro', async ({ name, age, country, password }) => {
    const user = userEvent.setup()
    const onCreateAccount = vi.fn()
    const onBack = vi.fn()

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response)

    render(<RegisterScreen onBack={onBack} onCreateAccount={onCreateAccount} />)

    await user.type(screen.getByLabelText(/nombre/i), name)
    await user.type(screen.getByLabelText(/edad/i), age)
    await user.type(screen.getByLabelText(/pa/i), country)
    await user.type(screen.getByLabelText(/contra/i), password)
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(onCreateAccount).toHaveBeenCalledWith(name)
    })
  })
})
