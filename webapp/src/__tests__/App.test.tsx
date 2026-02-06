import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { afterEach, describe, expect, test, vi } from 'vitest' 
import '@testing-library/jest-dom'

describe('App Component', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('permite el acceso rápido al juego y carga el tablero', async () => {
    const user = userEvent.setup()

    // Mock de la respuesta de Reset/Inicio de Rust
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        responseFromRust: { 
          size: 5, 
          layout: "././././." 
        } 
      }),
    } as Response)

    render(<App />)

    // 1. Escribimos el nombre en el Quick Access
    const input = screen.getByPlaceholderText(/your nickname/i)
    await user.type(input, 'JugadorPrueba')

    // 2. Pulsamos el botón de jugar
    const startButton = screen.getByRole('button', { name: /start playing/i })
    await user.click(startButton)

    // 3. Verificamos que pasamos a la pantalla de juego
    await waitFor(() => {
      expect(screen.getByText(/Jugador: JugadorPrueba/i)).toBeInTheDocument()
    })
  })

  test('realiza un movimiento al pulsar una celda', async () => {
    const user = userEvent.setup()

    // Mock para el inicio y luego para el movimiento
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ // Respuesta al entrar (Reset)
        ok: true,
        json: async () => ({ responseFromRust: { size: 5, layout: "././././." } }),
      } as Response)
      .mockResolvedValueOnce({ // Respuesta al mover (Move)
        ok: true,
        json: async () => ({ 
          responseFromRust: { size: 5, layout: "B/./././." },
          winner: null 
        }),
      } as Response)

    render(<App />)

    // Entramos al juego
    await user.type(screen.getByPlaceholderText(/your nickname/i), 'JugadorPrueba')
    await user.click(screen.getByRole('button', { name: /start playing/i }))

    // Buscamos las celdas (ahora que son botones es más fácil)
    // Usamos getAllByRole('gridcell') si pusiste ese role, o simplemente 'button'
    await waitFor(async () => {
      const cells = screen.getAllByRole('button', { name: /Celda 0/i })
      await user.click(cells[0])
    })

    // Verificamos que el mensaje de estado cambia
    await waitFor(() => {
      expect(screen.getByText(/Movimiento realizado!/i)).toBeInTheDocument()
    })
  })
})