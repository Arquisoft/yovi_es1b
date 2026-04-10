import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { describe, expect, test, vi } from 'vitest'
import { GuestAccessModal } from '../components/modals/GuestAccessModal'

describe('GuestAccessModal', () => {
  test('no renderiza nada si no hay motivo', () => {
    const { container } = render(
      <GuestAccessModal reason={null} onClose={vi.fn()} onGoLogin={vi.fn()} onGoRegister={vi.fn()} />
    )

    expect(container).toBeEmptyDOMElement()
  })

  test.each([
    ['perfil', /ver tu perfil/i],
    ['historial', /consultar el historial/i],
    ['amigos', /añadir amigos/i],
  ])('muestra el texto correcto para %s', async (reason, expectedText) => {
    render(
      <GuestAccessModal
        reason={reason as 'perfil' | 'historial' | 'amigos'}
        onClose={vi.fn()}
        onGoLogin={vi.fn()}
        onGoRegister={vi.fn()}
      />
    )

    expect(screen.getByRole('dialog', { name: /acceso restringido para invitados/i })).toBeInTheDocument()
    expect(screen.getByText(expectedText)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toHaveClass('guest-access-auth-button')
    expect(screen.getByRole('button', { name: /registrarse/i })).toHaveClass('guest-access-auth-button')
    expect(screen.getByRole('button', { name: /seguir como invitado/i })).toHaveClass('guest-access-guest-button')
  })

  test('dispara las acciones de login, registro y cerrar', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onGoLogin = vi.fn()
    const onGoRegister = vi.fn()

    render(
      <GuestAccessModal
        reason="amigos"
        onClose={onClose}
        onGoLogin={onGoLogin}
        onGoRegister={onGoRegister}
      />
    )

    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))
    await user.click(screen.getByRole('button', { name: /registrarse/i }))
    await user.click(screen.getByRole('button', { name: /seguir como invitado/i }))

    expect(onGoLogin).toHaveBeenCalled()
    expect(onGoRegister).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})
