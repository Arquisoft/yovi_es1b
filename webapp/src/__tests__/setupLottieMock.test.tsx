import { render, screen } from '@testing-library/react'
import Lottie from 'lottie-react'
import { describe, expect, test } from 'vitest'

describe('setup lottie mock', () => {
  test('usa el mock de lottie-react definido en setup', () => {
    render(<Lottie animationData={{}} />)
    expect(screen.getByTestId('mock-lottie')).toBeTruthy()
  })
})
