import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom'

describe('Home', () => {
  beforeAll(() => {
    vi.stubGlobal('scrollTo', vi.fn())
    
    // 1. MOCK DE RED GLOBAL: 
    // Evitamos el "fetch failed" que rompe el test al cargar App
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ['Easy', 'Medium', 'Hard'],
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  test('muestra la pantalla home con accesos de registro y login', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    // Usamos findBy porque App tiene efectos iniciales asíncronos
    expect(await screen.findByRole('heading', { name: /bienvenido a 'y'/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /registrarse/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /iniciar sesion/i })).toBeInTheDocument()
  })

  test('navega desde home a registro y vuelve a home', async () => {
    const user = userEvent.setup()
    
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    // 1. Ir a Registro
    const btnRegistro = await screen.findByRole('button', { name: /registrarse/i })
    await user.click(btnRegistro)
    
    // USAR findBy: La navegación de React Router es un cambio de estado asíncrono
    const tituloRegistro = await screen.findByRole('heading', { name: /zona de registro/i })
    expect(tituloRegistro).toBeInTheDocument()

    // 2. Volver a Home
    const btnVolver = screen.getByRole('button', { name: /volver/i })
    await user.click(btnVolver)
    
    // Verificar que regresamos
    const tituloHome = await screen.findByRole('heading', { name: /bienvenido a 'y'/i })
    expect(tituloHome).toBeInTheDocument()
  })
})