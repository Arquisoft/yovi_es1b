import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi, beforeEach } from 'vitest'
import FriendsScreen from '../screens/FriendsScreen'
import '@testing-library/jest-dom'

describe('Friends & Social Zone', () => {
  beforeEach(() => {
    vi.stubGlobal('scrollTo', vi.fn())
    // Mock de fetch para simular la API de búsqueda
    globalThis.fetch = vi.fn()
  })

  test('permite buscar un usuario y muestra los resultados', async () => {
    const user = userEvent.setup()
    
    // Simulamos que el servidor devuelve un usuario encontrado
    const mockUsers = [{ username: 'CyberPunk99', nickname: 'Cyber', gamesPlayed: 10 }]
    ;(globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUsers,
    })

    render(<FriendsScreen currentUser="Drus" onBack={vi.fn()} />)

    // 1. Escribimos en el buscador
    const input = screen.getByPlaceholderText(/nombre del usuario/i)
    const btnSearch = screen.getByRole('button', { name: /buscar/i })
    await act(async () => {
      await user.type(input, 'Cyber')
      await user.click(btnSearch)
    })

    // 3. Verificamos que aparece el resultado
    expect(await screen.findByText('Cyber')).toBeInTheDocument()
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('query=Cyber'))
  })

  test('al hacer clic en seguir se llama a la API correctamente', async () => {
    const user = userEvent.setup()
    
    // Mock para mostrar un usuario ya en la lista
    ;(globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ username: 'BotMaster', nickname: 'BotNick', isFollowing: false }],
    })

    render(<FriendsScreen currentUser="Drus" onBack={vi.fn()} />)

    // Buscamos para que salga el botón
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /buscar/i }))
    })
    const btnFollow = await screen.findByRole('button', { name: /seguir/i })

    // Mock para la acción de seguir
    ;(globalThis.fetch as any).mockResolvedValueOnce({ ok: true })
    await act(async () => {
      await user.click(btnFollow)
    })

    // Verificamos que se envió la petición de follow
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/follow'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  test('si falla la busqueda captura el error y lo reporta en consola', async () => {
    const user = userEvent.setup()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    ;(globalThis.fetch as any).mockRejectedValueOnce(new Error('network down'))

    render(<FriendsScreen currentUser="Drus" onBack={vi.fn()} />)
    await act(async () => {
      await user.type(screen.getByPlaceholderText(/nombre del usuario/i), 'Cyber')
      await user.click(screen.getByRole('button', { name: /buscar/i }))
    })

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error buscando usuarios:', expect.any(Error))
    expect(screen.getByText(/no se han encontrado usuarios/i)).toBeInTheDocument()
  })
})


