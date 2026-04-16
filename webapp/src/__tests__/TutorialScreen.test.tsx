import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  TutorialScreen,
} from '../screens/TutorialScreen'
import {
  allHelpImages,
  getHelpCaption,
  homeImages,
  loginEmptyImages,
  loginErrorDataImages,
  loginErrorServerImages,
  loginGoodImages,
  pickImageByName,
  registerEmptyImages,
  registerEmptySpaceImages,
  registerErrorPswdImages,
  registerGoodImages,
  settingsImages,
} from '../screens/tutorialHelpers'

const expectedFilenames = [
  'home.png',
  'registerEmpty.png',
  'registerEmptySpace.png',
  'registerErrorPswd.png',
  'registerGood.png',
  'settings.png',
  'loginEmpty.png',
  'loginErrorData.png',
  'loginErrorServer.png',
  'loginGood.png',
]

describe('TutorialScreen helpers', () => {
  test('allHelpImages incluye las capturas de ayuda esperadas', () => {
    const names = allHelpImages.map((image) => image.name)
    expect(names).toEqual(expect.arrayContaining(expectedFilenames))
  })

  test.each([
    ['home.png', homeImages],
    ['registerEmpty.png', registerEmptyImages],
    ['registerEmptySpace.png', registerEmptySpaceImages],
    ['registerErrorPswd.png', registerErrorPswdImages],
    ['registerGood.png', registerGoodImages],
    ['settings.png', settingsImages],
    ['loginEmpty.png', loginEmptyImages],
    ['loginErrorData.png', loginErrorDataImages],
    ['loginErrorServer.png', loginErrorServerImages],
    ['loginGood.png', loginGoodImages],
  ])('pickImageByName devuelve la captura correcta para %s', (fileName, images) => {
    const picked = pickImageByName(fileName)
    expect(picked).toEqual(images)
    expect(picked).toHaveLength(1)
    expect(picked[0]?.name).toBe(fileName)
  })

  test.each([
    ['registerEmptySpace.png', 'Campos vacíos'],
    ['registerEmpty.png', 'Formulario vacío'],
    ['registerErrorPswd.png', 'Error de contraseña'],
    ['registerGood.png', 'Formulario correcto'],
    ['settings.png', 'Ajustes'],
    ['home.png', 'Pantalla de inicio'],
    ['loginErrorData.png', 'loginErrorData.png'],
  ])('getHelpCaption traduce %s como %s', (imageName, expectedCaption) => {
    expect(getHelpCaption(imageName)).toBe(expectedCaption)
  })
})

describe('TutorialScreen', () => {
  const scrollIntoViewMock = vi.fn()

  beforeEach(() => {
    scrollIntoViewMock.mockClear()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: scrollIntoViewMock,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('no renderiza nada cuando está cerrada', () => {
    const { container } = render(<TutorialScreen isOpen={false} onClose={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  test('renderiza el índice, las secciones y todas las imágenes de ayuda', () => {
    render(<TutorialScreen isOpen onClose={vi.fn()} />)

    expect(screen.getByRole('dialog', { name: /ayuda de gamey/i })).toBeInTheDocument()
    expect(screen.getByText(/ayuda sobre esta web/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /1\. ventana de inicio/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /2\. ventana de registro/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /3\. ventana de inicio de sesión/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /4\. ventana de juego/i })).toBeInTheDocument()

    expectedFilenames.forEach((fileName) => {
      expect(screen.getByAltText(fileName)).toBeInTheDocument()
    })
  })

  test('los botones del índice desplazan a sus secciones', () => {
    render(<TutorialScreen isOpen onClose={vi.fn()} />)

    const buttonsToClick = [
      /1\. ventana de inicio/i,
      /1\.1 ajustes/i,
      /1\.2 captura de referencia/i,
      /2\. ventana de registro/i,
      /2\.1 formulario vacío/i,
      /2\.2 campos vacíos/i,
      /2\.3 error de contraseña/i,
      /2\.4 formulario correcto/i,
      /3\. ventana de inicio de sesión/i,
      /3\.1 formulario vacío/i,
      /3\.2 error de datos/i,
      /3\.3 error de servidor/i,
      /3\.4 inicio correcto/i,
      /4\. ventana de juego/i,
      /4\.1 ejemplo 1/i,
      /4\.2 ejemplo 2/i,
      /4\.3 ejemplo 3/i,
      /4\.4 ejemplo 4/i,
    ]

    buttonsToClick.forEach((name) => {
      fireEvent.click(screen.getByRole('button', { name }))
    })

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(buttonsToClick.length)
  })

  test.each([
    ['settings.png', 'No se pudo cargar: Ajustes'],
    ['home.png', 'No se pudo cargar: Pantalla de inicio'],
    ['registerEmptySpace.png', 'No se pudo cargar: Campos vacíos'],
    ['registerErrorPswd.png', 'No se pudo cargar: Error de contraseña'],
    ['loginErrorData.png', 'No se pudo cargar: loginErrorData.png'],
  ])('muestra caption de fallback para %s', (fileName, expectedCaption) => {
    render(<TutorialScreen isOpen onClose={vi.fn()} />)

    fireEvent.error(screen.getByAltText(fileName))

    expect(screen.getByText(expectedCaption)).toBeInTheDocument()
  })
})
