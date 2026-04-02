import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi, beforeEach } from 'vitest'
import FriendsScreen from '../screens/FriendsScreen'
import '@testing-library/jest-dom'

describe('Friends & Social Zone', () => {
  beforeEach(() => {
    vi.stubGlobal('scrollTo', vi.fn())
    // Mock de fetch para simular la API de búsqueda
    global.fetch = vi.fn()
  })

  test('permite buscar un usuario y muestra los resultados', async () => {
    const user = userEvent.setup()
    
    // Simulamos que el servidor devuelve un usuario encontrado
    const mockUsers = [{ username: 'CyberPunk99', nickname: 'Cyber', gamesPlayed: 10 }]
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUsers,
    })

    render(<FriendsScreen currentUser="Drus" onBack={vi.fn()} />)

    // 1. Escribimos en el buscador
    const input = screen.getByPlaceholderText(/nombre del usuario/i)
    await user.type(input, 'Cyber')
    
    // 2. Click en buscar
    const btnSearch = screen.getByRole('button', { name: /buscar/i })
    await user.click(btnSearch)

    // 3. Verificamos que aparece el resultado
    expect(await screen.findByText('Cyber')).toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('query=Cyber'))
  })

  test('al hacer clic en seguir se llama a la API correctamente', async () => {
    const user = userEvent.setup()
    
    // Mock para mostrar un usuario ya en la lista
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ username: 'BotMaster', nickname: 'BotNick', isFollowing: false }],
    })

    render(<FriendsScreen currentUser="Drus" onBack={vi.fn()} />)

    // Buscamos para que salga el botón
    await user.click(screen.getByRole('button', { name: /buscar/i }))
    
    const btnFollow = await screen.findByRole('button', { name: /seguir/i })
    
    // Mock para la acción de seguir
    ;(global.fetch as any).mockResolvedValueOnce({ ok: true })

    await user.click(btnFollow)

    // Verificamos que se envió la petición de follow
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/follow'),
      expect.objectContaining({ method: 'POST' })
    )
  })
})
