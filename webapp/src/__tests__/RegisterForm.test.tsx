import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HomeScreen from '../screens/HomeScreen'
import { afterEach, describe, expect, test, vi } from 'vitest' 
import '@testing-library/jest-dom'


describe('RegisterForm', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('muestra botones de registro e inicio de sesion', async () => {
    const onUsernameChange = vi.fn()
    const onStart = vi.fn()
    const onGoToRegister = vi.fn()
    const onGoToLogin = vi.fn()

    render(
      <HomeScreen
        username=""
        onUsernameChange={onUsernameChange}
        onStart={onStart}
        onGoToRegister={onGoToRegister}
        onGoToLogin={onGoToLogin}
      />
    )
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /registrarse/i }))
    expect(onGoToRegister).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: /iniciar sesion/i }))
    expect(onGoToLogin).toHaveBeenCalledTimes(1)
  })
})
