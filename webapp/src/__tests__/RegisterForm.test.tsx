import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterScreen, {
  getLanguageIcon,
  getTodayInputDate,
  normalizeBirthDateInput,
  isBirthDateInFuture,
  renderCountryOptionIcon,
  shouldShowNoIconsMessage,
} from '../screens/RegisterScreen'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'

const fillValidForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await act(async () => {
    await user.type(screen.getByLabelText(/nombre/i), 'Alice')
    // CAMBIADO: /nickname/i -> /apodo/i
    await user.type(screen.getByLabelText(/apodo/i), 'Ali')
    await user.type(screen.getByLabelText(/fecha de nacimiento/i), '2000-01-01')
    await user.click(screen.getByLabelText(/seleccionar spain/i))
    await user.type(screen.getByLabelText(/^Contraseña$/i), 'securePass123')
    await user.type(screen.getByLabelText(/confirmar Contraseña/i), 'securePass123')
  })
}

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.stubGlobal('scrollTo', vi.fn())
    // Ponemos una URL válida para evitar el error de Invalid URL
    vi.stubGlobal('location', { href: 'https://localhost/', protocol: 'https:' })
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  test('getLanguageIcon cubre encontrado y no encontrado', () => {
    expect(getLanguageIcon('espana')).toBeTruthy()
    expect(getLanguageIcon('token-que-no-existe')).toBeNull()
  })

  test('shouldShowNoIconsMessage cubre lista vacia y con iconos', () => {
    expect(shouldShowNoIconsMessage([])).toBe(true)
    expect(shouldShowNoIconsMessage([{ id: 'icon-1' }])).toBe(false)
  })

  test('renderCountryOptionIcon cubre icono y fallback', () => {
    const { container: iconContainer } = render(renderCountryOptionIcon('/flag.png', 'Spain'))
    expect(iconContainer.querySelector('img')).toHaveAttribute('src', '/flag.png')

    const { container: fallbackContainer } = render(renderCountryOptionIcon(null, 'Spain'))
    expect(fallbackContainer.querySelector('.country-flag-fallback')).toBeInTheDocument()
  })

  test('normalizeBirthDateInput recorta un año de mas de 4 digitos', () => {
    expect(normalizeBirthDateInput('123456-12-31')).toBe('1234-12-31')
    expect(normalizeBirthDateInput('2000-01-01')).toBe('2000-01-01')
  })

  test('getTodayInputDate devuelve una fecha en formato yyyy-mm-dd', () => {
    expect(getTodayInputDate(new Date(2024, 4, 6))).toBe('2024-05-06')
  })

  test('isBirthDateInFuture detecta fechas posteriores al dia de referencia', () => {
    expect(isBirthDateInFuture('2024-05-07', new Date(2024, 4, 6))).toBe(true)
    expect(isBirthDateInFuture('2024-05-06', new Date(2024, 4, 6))).toBe(false)
  })

  test('el campo apodo del registro limita a 15 caracteres', () => {
    render(<RegisterScreen onBack={vi.fn()} onCreateAccount={vi.fn()} />)

    expect(screen.getByLabelText(/apodo/i)).toHaveAttribute('maxLength', '15')
  })

  test('con datos incompletos no deja avanzar', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()

    render(<RegisterScreen onBack={vi.fn()} onCreateAccount={onCreate} />)

    await act(async () => {
      await user.type(screen.getByLabelText(/nombre/i), 'Alice')
      await user.click(screen.getByRole('button', { name: /crear cuenta/i }))
    })

    expect(onCreate).not.toHaveBeenCalled()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('si faltan campos obligatorios muestra error de campos en blanco', async () => {
    const onCreate = vi.fn()
    render(<RegisterScreen onBack={vi.fn()} onCreateAccount={onCreate} />)

    const submitButton = screen.getByRole('button', { name: /crear cuenta/i })
    const form = submitButton.closest('form')
    expect(form).not.toBeNull()
    await act(async () => {
      fireEvent.submit(form as HTMLFormElement)
    })

    expect(await screen.findByText(/no pueden estar en blanco/i)).toBeInTheDocument()
    expect(onCreate).not.toHaveBeenCalled()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('si la confirmacion de Contraseña no coincide, bloquea envio', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<RegisterScreen onBack={vi.fn()} onCreateAccount={onCreate} />)

    await act(async () => {
      await user.type(screen.getByLabelText(/nombre/i), 'Alice')
      await user.type(screen.getByLabelText(/apodo/i), 'Ali')
      await user.type(screen.getByLabelText(/fecha de nacimiento/i), '2000-01-01')
      await user.click(screen.getByLabelText(/seleccionar spain/i))
      await user.type(screen.getByLabelText(/^Contraseña$/i), 'securePass123')
      await user.type(screen.getByLabelText(/confirmar Contraseña/i), 'otroPass123')
      await user.click(screen.getByRole('button', { name: /crear cuenta/i }))
    })

    expect(await screen.findByText(/no coincide/i)).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
    expect(onCreate).not.toHaveBeenCalled()
  })

  test('si no hay idioma seleccionado muestra error de idioma requerido', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<RegisterScreen onBack={vi.fn()} onCreateAccount={onCreate} />)

    await act(async () => {
      await user.type(screen.getByLabelText(/nombre/i), 'Alice')
      await user.type(screen.getByLabelText(/apodo/i), 'Ali')
      await user.type(screen.getByLabelText(/fecha de nacimiento/i), '2000-01-01')
      await user.type(screen.getByLabelText(/^contrase/i), 'securePass123')
      await user.type(screen.getByLabelText(/confirmar/i), 'securePass123')
    })

    const submitButton = screen.getByRole('button', { name: /crear cuenta/i })
    const form = submitButton.closest('form')
    expect(form).not.toBeNull()
    await act(async () => {
      fireEvent.submit(form as HTMLFormElement)
    })

    expect(await screen.findByText(/debes seleccionar un idioma/i)).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
    expect(onCreate).not.toHaveBeenCalled()
  })

  test('el campo de fecha de nacimiento limita la seleccion hasta hoy', () => {
    render(<RegisterScreen onBack={vi.fn()} onCreateAccount={vi.fn()} />)

    expect(screen.getByLabelText(/fecha de nacimiento/i)).toHaveAttribute('max', getTodayInputDate())
  })

  test('si el backend rechaza muestra el mensaje de error', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Usuario ya existe' }),
    } as Response)

    render(<RegisterScreen onBack={vi.fn()} onCreateAccount={vi.fn()} />)
    await fillValidForm(user)
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /crear cuenta/i }))
    })

    await waitFor(() => {
      expect(screen.getByText(/usuario ya existe/i)).toBeInTheDocument()
    })
  })

  test('si backend rechaza sin error explicito, muestra mensaje generico', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response)

    render(<RegisterScreen onBack={vi.fn()} onCreateAccount={vi.fn()} />)
    await fillValidForm(user)
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /crear cuenta/i }))
    })

    expect(await screen.findByText(/error al crear la cuenta/i)).toBeInTheDocument()
  })

  test('si hay error de red muestra mensaje de red', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('network error'))

    render(<RegisterScreen onBack={vi.fn()} onCreateAccount={vi.fn()} />)
    await fillValidForm(user)
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /crear cuenta/i }))
    })

    expect(await screen.findByText(/error de red/i)).toBeInTheDocument()
  })

  test('si no se pasa onOpenSettings no renderiza el boton de configuracion', () => {
    render(<RegisterScreen onBack={vi.fn()} onCreateAccount={vi.fn()} onOpenTutorial={vi.fn()} />)

    expect(screen.queryByRole('button', { name: /configuración de elementos de fondo/i })).toBeNull()
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
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /crear cuenta/i }))
    })

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith('Alice', 'NEW-123', expect.any(String), 'Spain', 'Ali', undefined)
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/createuser$/),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    )
  })

  test('permite cambiar pais e icono antes de registrar', async () => {
    const user = userEvent.setup()
    render(<RegisterScreen onBack={vi.fn()} onCreateAccount={vi.fn()} />)

    const ukCheckbox = screen.getByLabelText(/seleccionar english/i) as HTMLInputElement

    await act(async () => {
      await user.click(ukCheckbox)
    })
    expect(ukCheckbox.checked).toBe(true)
    await act(async () => {
      await user.click(ukCheckbox)
    })
    expect(ukCheckbox.checked).toBe(false)

    const iconButtons = screen.getAllByRole('button', { name: /elegir/i })
    const nextIconButton = iconButtons.find((btn) => btn.getAttribute('aria-pressed') === 'false')

    if (nextIconButton) {
      await act(async () => {
        await user.click(nextIconButton)
      })
      expect(nextIconButton.getAttribute('aria-pressed')).toBe('true')
    }
  })

  test('permite seleccionar explicitamente Sin Avatar y un icono de mujer', async () => {
    const user = userEvent.setup()
    render(<RegisterScreen onBack={vi.fn()} onCreateAccount={vi.fn()} />)

    const noAvatarButton = screen.getByRole('button', { name: /elegir sin avatar/i })
    await act(async () => {
      await user.click(noAvatarButton)
    })
    expect(noAvatarButton).toHaveAttribute('aria-pressed', 'true')

    const femaleIconButton = screen.getByRole('button', { name: /elegir mujer1\.png/i })
    await act(async () => {
      await user.click(femaleIconButton)
    })
    expect(femaleIconButton.className).toContain('icon-option-selected')
  })

  test('el boton volver ejecuta onBack', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()

    render(<RegisterScreen onBack={onBack} onCreateAccount={vi.fn()} />)
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /volver/i }))
    })
    expect(onBack).toHaveBeenCalled()
  })

  test('el boton volver usa el estilo de cancelacion rojo', () => {
    render(<RegisterScreen onBack={vi.fn()} onCreateAccount={vi.fn()} />)

    expect(screen.getByRole('button', { name: /volver/i })).toHaveClass('cancel-button')
  })

  test('muestra el enlace para ir a login y ejecuta onGoToLogin', async () => {
    const user = userEvent.setup()
    const onGoToLogin = vi.fn()

    render(<RegisterScreen onBack={vi.fn()} onGoToLogin={onGoToLogin} onCreateAccount={vi.fn()} />)

    const loginLink = screen.getByRole('button', { name: /ya tengo una cuenta, iniciar sesión/i })
    expect(loginLink).toHaveClass('register-login-link')

    await act(async () => {
      await user.click(loginLink)
    })

    expect(onGoToLogin).toHaveBeenCalled()
  })

  test('muestra y ejecuta los accesos de ajustes y ayuda', async () => {
    const user = userEvent.setup()
    const onSettings = vi.fn()
    const onTutorial = vi.fn()

    render(
      <RegisterScreen
        onBack={vi.fn()}
        onCreateAccount={vi.fn()}
        onOpenSettings={onSettings}
        onOpenTutorial={onTutorial}
      />
    )

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /configuración de elementos de fondo/i }))
      await user.click(screen.getByRole('button', { name: /abrir ayuda/i }))
    })

    expect(onSettings).toHaveBeenCalled()
    expect(onTutorial).toHaveBeenCalled()
  })
})
