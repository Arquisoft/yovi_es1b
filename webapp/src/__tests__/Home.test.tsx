import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'

describe('Home', () => {
  beforeAll(() => {
    vi.stubGlobal('scrollTo', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('muestra la pantalla home con accesos de registro y login', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /bienvenido a 'y'/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /registrarse/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /iniciar sesion/i })).toBeInTheDocument()
  })

  test('navega desde home a registro y vuelve a home', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /registrarse/i }))
    expect(screen.getByRole('heading', { name: /zona de registro/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /volver/i }))
    expect(screen.getByRole('heading', { name: /bienvenido a 'y'/i })).toBeInTheDocument()
  })
})
