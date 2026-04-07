import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'
import { findIconSrcByName, getLanguageIcon, ProfileScreen, shouldShowNoIconsMessage } from '../screens/ProfileScreen'
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

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  test('getLanguageIcon cubre casos encontrado y no encontrado', () => {
    expect(getLanguageIcon('espana')).toBeTruthy()
    expect(getLanguageIcon('token-que-no-existe')).toBeNull()
  })

  test('findIconSrcByName cubre icono existente y fallback por defecto', () => {
    expect(findIconSrcByName('SinAvatar.png')).toBeTruthy()
    expect(findIconSrcByName('icono-inexistente.png')).toBe(defaultAvatar)
  })

  test('shouldShowNoIconsMessage cubre lista vacia y con iconos', () => {
    expect(shouldShowNoIconsMessage([])).toBe(true)
    expect(shouldShowNoIconsMessage([{ id: 'icon-1' }])).toBe(false)
  })

  test('no renderiza nada cuando esta cerrado', () => {
    render(<ProfileScreen isOpen={false} username="Alice" onClose={vi.fn()} />)
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

    render(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)

    expect(await screen.findByDisplayValue('Alice')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Ali')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2000-01-01')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /spain/i })).toBeChecked()
  })

  test('muestra error cuando getProfile devuelve data.error', async () => {
    mockedService.getProfile.mockResolvedValueOnce({
      error: 'Perfil no disponible',
    })

    render(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)

    expect(await screen.findByText(/perfil no disponible/i)).toBeInTheDocument()
  })

  test('muestra error generico cuando getProfile falla por excepcion', async () => {
    mockedService.getProfile.mockRejectedValueOnce(new Error('network down'))

    render(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)

    expect(await screen.findByText(/no se pudo cargar el perfil/i)).toBeInTheDocument()
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

    render(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)

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

  test('si no hay iconName ni icon usa SinAvatar por defecto', async () => {
    mockedService.getProfile.mockResolvedValueOnce({
      username: 'Alice',
      nickname: 'Ali',
      birthDate: '',
      language: 'English',
    })

    render(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)
    await screen.findByDisplayValue('Alice')

    const avatar = screen.getByAltText(/avatar seleccionado/i) as HTMLImageElement
    expect(avatar.src).toContain('SinAvatar')
  })

  test('selector de idioma cubre onChange al marcar y desmarcar', async () => {
    mockedService.getProfile.mockResolvedValueOnce({
      username: 'Alice',
      nickname: 'Ali',
      birthDate: '2000-01-01T00:00:00.000Z',
      language: '',
      iconName: 'SinAvatar.png',
    })

    render(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)
    await screen.findByDisplayValue('Alice')

    const englishCheckbox = screen.getByRole('checkbox', { name: /seleccionar english/i }) as HTMLInputElement
    expect(englishCheckbox.checked).toBe(false)

    fireEvent.change(englishCheckbox, { target: { checked: true } })
    expect(englishCheckbox.checked).toBe(true)

    fireEvent.change(englishCheckbox, { target: { checked: false } })
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

    render(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} onIconUpdated={onIconUpdated} />)

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

    render(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)
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

    render(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)
    await screen.findByDisplayValue('Alice')

    await user.click(screen.getByRole('button', { name: /cambiar Contraseña/i }))
    await user.click(screen.getByRole('button', { name: /guardar nueva Contraseña/i }))

    expect(await screen.findByText(/completa los tres campos de Contraseña/i)).toBeInTheDocument()
    expect(mockedService.changePassword).not.toHaveBeenCalled()
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

    render(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)
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

    render(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)
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

    render(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)
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

    render(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)
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

    render(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)
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

    render(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)
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
