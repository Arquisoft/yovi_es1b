import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'
import {
  findIconSrcByName,
  getLanguageIcon,
  getLanguageIconDisplayState,
  ProfileScreen,
  renderAvatarIconPicker,
  shouldShowNoIconsMessage,
} from '../screens/ProfileScreen'
import defaultAvatar from '../assets/icon/SinAvatar.png'
import { gameService } from '../services/gameService'

vi.mock('../services/gameService', () => ({
  gameService: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
  },
}))

describe('ProfileScreen', () => {
  const mockedService = gameService as unknown as {
    getProfile: ReturnType<typeof vi.fn>
    updateProfile: ReturnType<typeof vi.fn>
    changePassword: ReturnType<typeof vi.fn>
  }
  let consoleErrorSpy: ReturnType<typeof vi.spyOn> | null = null
  let stderrSpy: ReturnType<typeof vi.spyOn> | null = null

  const renderProfileScreen = async (ui: Parameters<typeof render>[0]) => {
    let result: ReturnType<typeof render> | undefined
    await act(async () => {
      result = render(ui)
      await Promise.resolve()
      await Promise.resolve()
    })
    return result!
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(((chunk: string | Uint8Array) => {
      const text = typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8')
      if (text.includes('not wrapped in act')) return true
      return true
    }) as typeof process.stderr.write)
  })

  afterEach(async () => {
    consoleErrorSpy?.mockRestore()
    consoleErrorSpy = null
    stderrSpy?.mockRestore()
    stderrSpy = null
    const i18n = (await import('../i18n')).default
    await act(async () => {
      await i18n.changeLanguage('es')
    })
  })

  test('getLanguageIcon cubre casos encontrado y no encontrado', () => {
    expect(getLanguageIcon('espana')).toBeTruthy()
    expect(getLanguageIcon('token-que-no-existe')).toBeNull()
  })

  test('getLanguageIconDisplayState cubre icono presente y ausente', () => {
    expect(getLanguageIconDisplayState('flag.png')).toEqual({
      src: 'flag.png',
      iconDisplay: 'block',
      fallbackDisplay: 'none',
    })
    expect(getLanguageIconDisplayState(null)).toEqual({
      src: '',
      iconDisplay: 'none',
      fallbackDisplay: 'block',
    })
  })

  test('renderAvatarIconPicker cubre mensaje sin iconos y selector con iconos', () => {
    const noAvatar = { id: '0', src: '/sin-avatar.png', name: 'SinAvatar.png' }
    const male = [{ id: '1', src: '/hombre1.png', name: 'hombre1.png' }]
    const female = [{ id: '2', src: '/mujer1.png', name: 'mujer1.png' }]
    const setAvatarDraft = vi.fn()

    const { rerender } = render(
      <div>
        {renderAvatarIconPicker([], '', setAvatarDraft, noAvatar, male, female)}
      </div>
    )
    expect(screen.getByText(/anade iconos en/i)).toBeInTheDocument()

    rerender(
      <div>
        {renderAvatarIconPicker([noAvatar], '', setAvatarDraft, noAvatar, male, female)}
      </div>
    )
    expect(screen.getByRole('button', { name: /elegir sin avatar/i })).toBeInTheDocument()
    const maleButton = screen.getByRole('button', { name: /elegir hombre1\.png/i })
    expect(maleButton).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /elegir mujer1\.png/i })).toBeInTheDocument()

    fireEvent.click(maleButton)
    expect(setAvatarDraft).toHaveBeenCalledWith('hombre1.png')

    rerender(
      <div>
        {renderAvatarIconPicker([noAvatar], 'hombre1.png', setAvatarDraft, noAvatar, male, female)}
      </div>
    )
    const updatedMaleButton = screen.getByRole('button', { name: /elegir hombre1\.png/i })
    expect(updatedMaleButton).toHaveClass('icon-option-selected')
    expect(updatedMaleButton).toHaveAttribute('aria-pressed', 'true')
  })

  test('findIconSrcByName cubre icono existente y fallback por defecto', () => {
    expect(findIconSrcByName('SinAvatar.png')).toBeTruthy()
    expect(findIconSrcByName('icono-inexistente.png')).toBe(defaultAvatar)
  })

  test('shouldShowNoIconsMessage cubre lista vacia y con iconos', () => {
    expect(shouldShowNoIconsMessage([])).toBe(true)
    expect(shouldShowNoIconsMessage([{ id: 'icon-1' }])).toBe(false)
  })

  test('el campo apodo del perfil limita a 15 caracteres', async () => {
    await renderProfileScreen(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)

    const nickInput = screen.getByLabelText(/apodo/i)
    expect(nickInput).toHaveAttribute('maxLength', '15')
  })

  test('no renderiza nada cuando esta cerrado', async () => {
    await renderProfileScreen(<ProfileScreen isOpen={false} username="Alice" onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog', { name: /ver mi perfil/i })).not.toBeInTheDocument()
  })

  test('carga y muestra datos del perfil', async () => {
    mockedService.getProfile.mockResolvedValueOnce({
      username: 'Alice',
      nickname: 'Ali',
      birthDate: '2000-01-01T00:00:00.000Z',
      language: 'Spain',
      iconName: 'hombre1.png',
    })

    await renderProfileScreen(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)

    expect(await screen.findByDisplayValue('Alice')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Ali')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2000-01-01')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /spain/i })).toBeChecked()
  })

  test('muestra error cuando getProfile devuelve data.error', async () => {
    mockedService.getProfile.mockResolvedValueOnce({
      error: 'Perfil no disponible',
    })

    await renderProfileScreen(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)

    expect(await screen.findByText(/perfil no disponible/i)).toBeInTheDocument()
  })

  test('muestra error generico cuando getProfile falla por excepcion', async () => {
    mockedService.getProfile.mockRejectedValueOnce(new Error('network down'))

    await renderProfileScreen(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)

    expect(await screen.findByText(/no se pudo cargar el perfil/i)).toBeInTheDocument()
  })

  test('mientras getProfile sigue pendiente el formulario queda deshabilitado y luego se recupera tras un error', async () => {
    let rejectProfile!: (reason?: unknown) => void
    const profilePromise = new Promise<never>((_, reject) => {
      rejectProfile = reject
    })

    mockedService.getProfile.mockReturnValueOnce(profilePromise)

    await renderProfileScreen(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)

    const saveButton = screen.getByRole('button', { name: /guardando/i })
    expect(saveButton).toBeDisabled()

    await act(async () => {
      rejectProfile(new Error('network down'))
      await expect(profilePromise).rejects.toThrow('network down')
    })

    expect(await screen.findByText(/no se pudo cargar el perfil/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /guardar perfil/i })).not.toBeDisabled()
  })

  test('si el componente se desmonta antes de resolver getProfile no actualiza estado', async () => {
    let resolveProfile!: (value: {
      username: string
      nickname: string
      birthDate: string
      language: string
      iconName: string
    }) => void

    const profilePromise = new Promise<typeof resolveProfile extends (value: infer T) => void ? T : never>((resolve) => {
      resolveProfile = resolve
    })

    mockedService.getProfile.mockReturnValueOnce(profilePromise)

    const { unmount } = await renderProfileScreen(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)
    unmount()

    await act(async () => {
      resolveProfile({
        username: 'Alice',
        nickname: 'LateNick',
        birthDate: '2000-01-01T00:00:00.000Z',
        language: 'English',
        iconName: 'hombre1.png',
      })
      await profilePromise
    })

    expect(mockedService.getProfile).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('yovi_user_nickname')).toBeNull()
    expect(localStorage.getItem('yovi_user_language')).toBeNull()
    expect(screen.queryByDisplayValue('LateNick')).not.toBeInTheDocument()
  })

  test('si nickname y language vienen vacios, limpia localStorage y usa icon desde data.icon', async () => {
    localStorage.setItem('yovi_user_nickname', 'oldNick')
    localStorage.setItem('yovi_user_language', 'Spain')

    mockedService.getProfile.mockResolvedValueOnce({
      username: 'Bob',
      nickname: '',
      birthDate: null,
      language: '',
      icon: 'hombre2.png',
    })

    await renderProfileScreen(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)

    const nameInput = (await screen.findByLabelText(/nombre/i)) as HTMLInputElement
    const nickInput = screen.getByLabelText(/apodo/i) as HTMLInputElement
    expect(nameInput.value).toBe('Bob')
    expect(nickInput.value).toBe('Bob')
    const birthDateInput = screen.getByLabelText(/fecha de nacimiento/i) as HTMLInputElement
    expect(birthDateInput.value).toBe('')
    expect(localStorage.getItem('yovi_user_nickname')).toBe('Bob')
    expect(localStorage.getItem('yovi_user_language')).toBeNull()

    const avatar = screen.getByAltText(/avatar seleccionado/i) as HTMLImageElement
    expect(avatar.src).toContain('hombre2')
  })

  test('si nickname y username vienen vacios elimina el nickname guardado', async () => {
    localStorage.setItem('yovi_user_nickname', 'oldNick')
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem')

    mockedService.getProfile.mockResolvedValueOnce({
      username: '',
      nickname: '',
      birthDate: null,
      language: 'English',
      iconName: 'SinAvatar.png',
    })

    await renderProfileScreen(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)

    const nameInput = (await screen.findByLabelText(/nombre/i)) as HTMLInputElement
    const nickInput = screen.getByLabelText(/apodo/i) as HTMLInputElement
    expect(nameInput.value).toBe('Alice')
    expect(nickInput.value).toBe('')
    expect(removeItemSpy).toHaveBeenCalledWith('yovi_user_nickname')
    expect(localStorage.getItem('yovi_user_nickname')).toBeNull()

    removeItemSpy.mockRestore()
  })

  test('si no hay iconName ni icon usa SinAvatar por defecto', async () => {
    mockedService.getProfile.mockResolvedValueOnce({
      username: 'Alice',
      nickname: 'Ali',
      birthDate: '',
      language: 'English',
    })

    await renderProfileScreen(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)
    await screen.findByDisplayValue('Alice')

    const avatar = screen.getByAltText(/avatar seleccionado/i) as HTMLImageElement
    expect(avatar.src).toContain('SinAvatar')
  })

  test('selector de idioma cubre onChange al marcar y desmarcar', async () => {
    const user = userEvent.setup()
    mockedService.getProfile.mockResolvedValueOnce({
      username: 'Alice',
      nickname: 'Ali',
      birthDate: '2000-01-01T00:00:00.000Z',
      language: '',
      iconName: 'SinAvatar.png',
    })

    await renderProfileScreen(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)
    await screen.findByDisplayValue('Alice')

    const englishCheckbox = screen.getByRole('checkbox', { name: /seleccionar english/i }) as HTMLInputElement
    expect(englishCheckbox.checked).toBe(false)

    await user.click(englishCheckbox)
    expect(englishCheckbox.checked).toBe(true)

    await user.click(englishCheckbox)
    expect(englishCheckbox.checked).toBe(false)
  })

  test('guarda cambios de perfil y notifica icono actualizado', async () => {
    const user = userEvent.setup()
    const onIconUpdated = vi.fn()

    // Mock de carga inicial
    mockedService.getProfile.mockResolvedValueOnce({
      username: 'Alice',
      nickname: 'Ali',
      birthDate: '2000-01-01T00:00:00.000Z',
      language: 'Spain',
      iconName: 'SinAvatar.png',
    })

    // Mock de guardado
    mockedService.updateProfile.mockResolvedValueOnce({
      message: 'Perfil actualizado correctamente',
    })

    await renderProfileScreen(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} onIconUpdated={onIconUpdated} />)

    // 1. Esperamos a que carguen los datos (el nickname por ejemplo)
    const nickInput = await screen.findByLabelText(/apodo/i)
    
    // 2. Realizamos los cambios
    await user.click(screen.getByRole('checkbox', { name: /english/i }))
    
    const dateInput = screen.getByLabelText(/fecha de nacimiento/i)
    await user.clear(dateInput)
    await user.type(dateInput, '2001-02-03')
    
    await user.clear(nickInput)
    await user.type(nickInput, 'NewNick')

    // 3. Guardamos
    const saveButton = screen.getByRole('button', { name: /guardar perfil/i })
    await user.click(saveButton)

    // 4. CLAVE: Metemos el check del callback DENTRO del waitFor
    await waitFor(() => {
      expect(mockedService.updateProfile).toHaveBeenCalledWith( {
        birthDate: '2001-02-03',
        language: 'English',
        nickname: 'NewNick',
        iconName: expect.any(String),
      })
      // Verificamos el callback aquí dentro porque sucede tras el await del service
      expect(onIconUpdated).toHaveBeenCalled()
    }, { timeout: 2000 }) // Damos un poco más de margen si es necesario
  })

  test('no permite cambiar Contraseña si no coincide confirmacion', async () => {
    const user = userEvent.setup()
    mockedService.getProfile.mockResolvedValueOnce({
      username: 'Alice',
      nickname: 'Ali',
      birthDate: '2000-01-01T00:00:00.000Z',
      language: 'Spain',
      iconName: 'SinAvatar.png',
    })

    await renderProfileScreen(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)
    await screen.findByDisplayValue('Alice')

    await user.click(screen.getByRole('button', { name: /cambiar Contraseña/i }))
    await user.type(screen.getByPlaceholderText(/Contraseña actual/i), 'oldpass123')
    await user.type(screen.getByPlaceholderText(/^nueva Contraseña$/i), 'newpass123')
    await user.type(screen.getByPlaceholderText(/^confirmar nueva Contraseña$/i), 'different123')
    await user.click(screen.getByRole('button', { name: /guardar nueva Contraseña/i }))

    expect(await screen.findByText(/no coinciden/i)).toBeInTheDocument()
    expect(mockedService.changePassword).not.toHaveBeenCalled()
  })

  test('no permite cambiar Contraseña si faltan campos requeridos', async () => {
    const user = userEvent.setup()
    mockedService.getProfile.mockResolvedValueOnce({
      username: 'Alice',
      nickname: 'Ali',
      birthDate: '2000-01-01T00:00:00.000Z',
      language: 'Spain',
      iconName: 'SinAvatar.png',
    })

    await renderProfileScreen(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)
    await screen.findByDisplayValue('Alice')

    await user.click(screen.getByRole('button', { name: /cambiar Contraseña/i }))
    await user.click(screen.getByRole('button', { name: /guardar nueva Contraseña/i }))

    expect(await screen.findByText(/completa los tres campos de Contraseña/i)).toBeInTheDocument()
    expect(mockedService.changePassword).not.toHaveBeenCalled()
  })

  test('muestra error si changePassword falla y vuelve a habilitar el formulario', async () => {
    const user = userEvent.setup()
    mockedService.getProfile.mockResolvedValueOnce({
      username: 'Alice',
      nickname: 'Ali',
      birthDate: '2000-01-01T00:00:00.000Z',
      language: 'Spain',
      iconName: 'SinAvatar.png',
    })
    mockedService.changePassword.mockRejectedValueOnce(new Error('network down'))

    await renderProfileScreen(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)
    await screen.findByDisplayValue('Alice')

    await user.click(screen.getByRole('button', { name: /cambiar Contraseña/i }))
    await user.type(screen.getByPlaceholderText(/Contraseña actual/i), 'oldpass123')
    await user.type(screen.getByPlaceholderText(/^nueva Contraseña$/i), 'newpass123')
    await user.type(screen.getByPlaceholderText(/^confirmar nueva Contraseña$/i), 'newpass123')

    const savePasswordButton = screen.getByRole('button', { name: /guardar nueva Contraseña/i })
    await user.click(savePasswordButton)

    expect(await screen.findByText(/no se pudo actualizar la Contraseña/i)).toBeInTheDocument()
    expect(mockedService.changePassword).toHaveBeenCalledWith('oldpass123', 'newpass123')
    expect(screen.getByRole('button', { name: /guardar nueva Contraseña/i })).not.toBeDisabled()
  })



  test('obliga a elegir avatar y permite guardarlo antes de guardar perfil', async () => {
    const user = userEvent.setup()

    mockedService.getProfile.mockResolvedValueOnce({
      username: 'Alice',
      nickname: 'Ali',
      birthDate: '2000-01-01T00:00:00.000Z',
      language: 'Spain',
      iconName: 'SinAvatar.png',
    })
    mockedService.updateProfile.mockResolvedValueOnce({
      message: 'Perfil actualizado correctamente',
    })

    await renderProfileScreen(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)
    await screen.findByDisplayValue('Alice')

    await user.click(screen.getByRole('button', { name: /modificar avatar/i }))
    await user.click(screen.getByRole('button', { name: /guardar avatar/i }))
    expect(await screen.findByText(/debes elegir un avatar/i)).toBeInTheDocument()

    const iconButtons = screen.getAllByRole('button', { name: /elegir/i })
    expect(iconButtons.length).toBeGreaterThan(0)
    const targetButton =
      iconButtons.find((btn) => (btn.getAttribute('aria-label') ?? '').includes('.png')) ?? iconButtons[0]
    const targetLabel = targetButton.getAttribute('aria-label') ?? ''
    const selectedIconName = targetLabel.replace('Elegir ', '').trim()
    await user.click(targetButton)
    await user.click(screen.getByRole('button', { name: /guardar avatar/i }))

    await user.click(screen.getByRole('button', { name: /guardar perfil/i }))

    await waitFor(() => {
      expect(mockedService.updateProfile).toHaveBeenCalledWith( {
        birthDate: '2000-01-01',
        language: 'Spain',
        nickname: 'Ali',
        iconName: selectedIconName,
      })
    })
  })

  test('al hacer click en un icono se marca como seleccionado en el grid', async () => {
    const user = userEvent.setup()
    mockedService.getProfile.mockResolvedValueOnce({
      username: 'Alice',
      nickname: 'Ali',
      birthDate: '2000-01-01T00:00:00.000Z',
      language: 'Spain',
      iconName: 'SinAvatar.png',
    })

    await renderProfileScreen(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)
    await screen.findByDisplayValue('Alice')

    await user.click(screen.getByRole('button', { name: /modificar avatar/i }))

    const iconButtons = screen.getAllByRole('button', { name: /elegir/i })
    const targetButton =
      iconButtons.find((btn) => (btn.getAttribute('aria-label') ?? '').includes('.png')) ?? iconButtons[0]

    expect(targetButton.className).toContain('icon-option')
    expect(targetButton.className).not.toContain('icon-option-selected')

    await user.click(targetButton)

    expect(targetButton.className).toContain('icon-option-selected')
  })

  test('cancelar avatar limpia estado temporal y cierra el editor', async () => {
    const user = userEvent.setup()
    mockedService.getProfile.mockResolvedValueOnce({
      username: 'Alice',
      nickname: 'Ali',
      birthDate: '2000-01-01T00:00:00.000Z',
      language: 'Spain',
      iconName: 'SinAvatar.png',
    })

    await renderProfileScreen(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)
    await screen.findByDisplayValue('Alice')

    await user.click(screen.getByRole('button', { name: /modificar avatar/i }))
    await user.click(screen.getByRole('button', { name: /guardar avatar/i }))
    expect(await screen.findByText(/debes elegir un avatar/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(screen.queryByRole('dialog', { name: /seleccionar avatar/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /modificar avatar/i }))
    expect(screen.queryByText(/debes elegir un avatar/i)).not.toBeInTheDocument()
  })

  test('guardar perfil con error de backend muestra data.error', async () => {
    const user = userEvent.setup()
    mockedService.getProfile.mockResolvedValueOnce({
      username: 'Alice',
      nickname: 'Ali',
      birthDate: '2000-01-01T00:00:00.000Z',
      language: 'Spain',
      iconName: 'SinAvatar.png',
    })
    mockedService.updateProfile.mockResolvedValueOnce({
      error: 'No se pudo guardar',
    })

    await renderProfileScreen(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)
    await screen.findByDisplayValue('Alice')

    await user.click(screen.getByRole('button', { name: /guardar perfil/i }))

    expect(await screen.findByText(/no se pudo guardar/i)).toBeInTheDocument()
  })

  test('guardar perfil con excepcion muestra error generico', async () => {
    const user = userEvent.setup()
    mockedService.getProfile.mockResolvedValueOnce({
      username: 'Alice',
      nickname: 'Ali',
      birthDate: '2000-01-01T00:00:00.000Z',
      language: 'Spain',
      iconName: 'SinAvatar.png',
    })
    mockedService.updateProfile.mockRejectedValueOnce(new Error('network down'))

    await renderProfileScreen(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)
    await screen.findByDisplayValue('Alice')

    await user.click(screen.getByRole('button', { name: /guardar perfil/i }))

    expect(await screen.findByText(/no se pudo actualizar el perfil/i)).toBeInTheDocument()
  })

  test('guardar perfil con birthDate vacio envia null y limpia localStorage cuando nickname/language estan vacios', async () => {
    const user = userEvent.setup()
    localStorage.setItem('yovi_user_nickname', 'oldNick')
    localStorage.setItem('yovi_user_language', 'Spain')

    mockedService.getProfile.mockResolvedValueOnce({
      username: 'Alice',
      nickname: 'Ali',
      birthDate: '2000-01-01T00:00:00.000Z',
      language: 'Spain',
      iconName: 'SinAvatar.png',
    })
    mockedService.updateProfile.mockResolvedValueOnce({
      message: 'Perfil actualizado correctamente',
    })

    await renderProfileScreen(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)
    await screen.findByDisplayValue('Alice')

    const dateInput = screen.getByLabelText(/fecha de nacimiento/i)
    await user.clear(dateInput)
    await user.click(screen.getByRole('checkbox', { name: /seleccionar spain/i }))

    const nickInput = screen.getByLabelText(/apodo/i)
    await user.clear(nickInput)

    await user.click(screen.getByRole('button', { name: /guardar perfil/i }))

    await waitFor(() => {
      expect(mockedService.updateProfile).toHaveBeenCalledWith({
        birthDate: null,
        language: '',
        nickname: '',
        iconName: expect.any(String),
      })
    })

    expect(localStorage.getItem('yovi_user_nickname')).toBeNull()
    expect(localStorage.getItem('yovi_user_language')).toBeNull()
    expect(screen.getByText(/perfil actualizado correctamente/i)).toBeInTheDocument()
  })
})

