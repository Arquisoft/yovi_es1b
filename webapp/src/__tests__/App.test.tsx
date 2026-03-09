import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { afterEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'

describe('App Component', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('muestra la pantalla de inicio con opciones de registro y login', async () => {
    render(<App />)

    expect(screen.getByText(/BIENVENIDO A 'Y'/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Registrarse/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Iniciar sesion/i })).toBeInTheDocument()
  })

  test('realiza un movimiento al pulsar una celda desde el login', async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn()
        .mockResolvedValueOnce({  // GET /difficulties
          ok: true,
          json: async () => ({ difficulties: ['Easy', 'Medium', 'Hard'] }),
        } as Response)
        .mockResolvedValueOnce({  // POST /login
          ok: true,
          json: async () => ({ message: 'Login correcto' }),
        } as Response)
        .mockResolvedValueOnce({  // POST /play (inicio de partida)
          ok: true,
          json: async () => ({
            responseFromRust: { size: 5, layout: "././././." }
          }),
        } as Response)
        .mockResolvedValueOnce({  // POST /move
          ok: true,
          json: async () => ({
            responseFromRust: { size: 5, layout: "B/./././." },
            winner: null
          }),
        } as Response)

    render(<App />)

    // Navegamos a Login
    await user.click(screen.getByRole('button', { name: /Iniciar sesion/i }))

    // Rellenamos el formulario usando getByLabelText (no hay placeholders)
    await user.type(screen.getByLabelText(/Nombre de usuario/i), 'JugadorPrueba')
    await user.type(screen.getByLabelText(/Contraseña/i), 'password123')
    await user.click(screen.getByRole('button', { name: /Iniciar sesion/i }))

    // Verificamos que entramos al juego (el nombre aparece en la navbar)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /JugadorPrueba/i })).toBeInTheDocument()
    })
  })
})