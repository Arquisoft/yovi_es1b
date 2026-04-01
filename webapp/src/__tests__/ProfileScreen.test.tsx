import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'
import { ProfileScreen } from '../screens/ProfileScreen'
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

  test('guarda cambios de perfil y notifica icono actualizado', async () => {
    const user = userEvent.setup()
    const onIconUpdated = vi.fn()

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

    render(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} onIconUpdated={onIconUpdated} />)

    await screen.findByDisplayValue('Alice')
    await user.click(screen.getByRole('checkbox', { name: /english/i }))
    await user.clear(screen.getByLabelText(/fecha de nacimiento/i))
    await user.type(screen.getByLabelText(/fecha de nacimiento/i), '2001-02-03')
    await user.clear(screen.getByLabelText(/nickname/i))
    await user.type(screen.getByLabelText(/nickname/i), 'NewNick')

    await user.click(screen.getByRole('button', { name: /guardar perfil/i }))

    await waitFor(() => {
      expect(mockedService.updateProfile).toHaveBeenCalledWith('Alice', {
        birthDate: '2001-02-03',
        language: 'English',
        nickname: 'NewNick',
        iconName: expect.any(String),
      })
    })
    expect(onIconUpdated).toHaveBeenCalled()
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

  test('cambia Contraseña cuando verificacion es valida', async () => {
    const user = userEvent.setup()
    mockedService.getProfile.mockResolvedValueOnce({
      username: 'Alice',
      nickname: 'Ali',
      birthDate: '2000-01-01T00:00:00.000Z',
      language: 'Spain',
      iconName: 'SinAvatar.png',
    })
    mockedService.changePassword.mockResolvedValueOnce({
      message: 'Contraseña actualizada correctamente',
    })

    render(<ProfileScreen isOpen username="Alice" onClose={vi.fn()} />)
    await screen.findByDisplayValue('Alice')

    await user.click(screen.getByRole('button', { name: /cambiar Contraseña/i }))
    await user.type(screen.getByPlaceholderText(/Contraseña actual/i), 'oldpass123')
    await user.type(screen.getByPlaceholderText(/^nueva Contraseña$/i), 'newpass123')
    await user.type(screen.getByPlaceholderText(/^confirmar nueva Contraseña$/i), 'newpass123')
    await user.click(screen.getByRole('button', { name: /guardar nueva Contraseña/i }))

    await waitFor(() => {
      expect(mockedService.changePassword).toHaveBeenCalledWith('Alice', 'oldpass123', 'newpass123')
    })
    expect(await screen.findByText(/Contraseña actualizada correctamente/i)).toBeInTheDocument()
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
      expect(mockedService.updateProfile).toHaveBeenCalledWith('Alice', {
        birthDate: '2000-01-01',
        language: 'Spain',
        nickname: 'Ali',
        iconName: selectedIconName,
      })
    })
  })
})
