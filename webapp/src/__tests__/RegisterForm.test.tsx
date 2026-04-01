import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterScreen from '../screens/RegisterScreen'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'

const fillValidForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(/nombre/i), 'Alice')
  await user.type(screen.getByLabelText(/nickname/i), 'Ali')
  await user.type(screen.getByLabelText(/fecha de nacimiento/i), '2000-01-01')
  await user.click(screen.getByLabelText(/seleccionar spain/i))
  await user.type(screen.getByLabelText(/^Contraseña$/i), 'securePass123')
  await user.type(screen.getByLabelText(/confirmar Contraseña/i), 'securePass123')
}

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.stubGlobal('scrollTo', vi.fn())
    vi.stubGlobal('location', { href: '' })
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

    await user.type(screen.getByLabelText(/nombre/i), 'Alice')
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

    expect(onCreate).not.toHaveBeenCalled()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('si la confirmacion de Contraseña no coincide, bloquea envio', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<RegisterScreen onBack={vi.fn()} onCreateAccount={onCreate} />)

    await user.type(screen.getByLabelText(/nombre/i), 'Alice')
    await user.type(screen.getByLabelText(/fecha de nacimiento/i), '2000-01-01')
    await user.click(screen.getByLabelText(/seleccionar spain/i))
    await user.type(screen.getByLabelText(/^Contraseña$/i), 'securePass123')
    await user.type(screen.getByLabelText(/confirmar Contraseña/i), 'otroPass123')
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

    expect(await screen.findByText(/no coincide/i)).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
    expect(onCreate).not.toHaveBeenCalled()
  })

  test('si el backend rechaza muestra el mensaje de error', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Usuario ya existe' }),
    } as Response)

    render(<RegisterScreen onBack={vi.fn()} onCreateAccount={vi.fn()} />)
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => {
      expect(screen.getByText(/usuario ya existe/i)).toBeInTheDocument()
    })
  })

  test('si hay error de red muestra mensaje de red', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('network error'))

    render(<RegisterScreen onBack={vi.fn()} onCreateAccount={vi.fn()} />)
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

    expect(await screen.findByText(/error de red al crear la cuenta/i)).toBeInTheDocument()
  })

  test('un registro exitoso llama a onCreateAccount y envia payload correcto', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        friendCode: 'NEW-123',
      }),
    } as Response)

    render(<RegisterScreen onBack={vi.fn()} onCreateAccount={onCreate} />)
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith('Alice', 'NEW-123', expect.any(String), 'Spain', 'Ali')
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/createuser$/),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const [, options] = (global.fetch as any).mock.calls[0]
    const payload = JSON.parse(options.body)
    expect(payload).toMatchObject({
      username: 'Alice',
      nickname: 'Ali',
      birthDate: '2000-01-01',
      language: 'Spain',
      password: 'securePass123',
    })
    expect(typeof payload.iconName).toBe('string')
  })

  test('permite cambiar pais e icono antes de registrar', async () => {
    const user = userEvent.setup()
    render(<RegisterScreen onBack={vi.fn()} onCreateAccount={vi.fn()} />)

    const ukCheckbox = screen.getByLabelText(/seleccionar english/i) as HTMLInputElement
    const spainCheckbox = screen.getByLabelText(/seleccionar spain/i) as HTMLInputElement
    expect(ukCheckbox.checked).toBe(false)
    expect(spainCheckbox.checked).toBe(false)

    await user.click(ukCheckbox)
    expect(ukCheckbox.checked).toBe(true)
    expect(spainCheckbox.checked).toBe(false)

    const iconButtons = screen.getAllByRole('button', { name: /elegir/i })
    const initialSelected = iconButtons.find((btn) => btn.getAttribute('aria-pressed') === 'true')
    const nextIconButton = iconButtons.find((btn) => btn !== initialSelected)
    expect(nextIconButton).toBeTruthy()

    if (nextIconButton) {
      await user.click(nextIconButton)
      expect(nextIconButton.getAttribute('aria-pressed')).toBe('true')
    }
  })

  test('el boton volver ejecuta onBack', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()

    render(<RegisterScreen onBack={onBack} onCreateAccount={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /volver/i }))
    expect(onBack).toHaveBeenCalled()
  })
})
