import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { TutorialScreen } from '../screens/TutorialScreen'
import {
  allHelpImages,
  gameDifficultImages,
  gameEndedImages,
  gameFriendsImages,
  gameHistorialImages,
  gameInGameImages,
  gameLoseImages,
  gameNavImages,
  gamePointsImages,
  gameSizeImages,
  gameTemporizatorImages,
  gameViewMyProfileImages,
  gameWinImages,
  getHelpCaption,
  helpGameImages,
  helpHomeImages,
  helpLoginImages,
  helpRegisterImages,
  homeImages,
  languageImages,
  loginBlankImages,
  loginErrorBadUsernamePswdImages,
  loginErrorServerImages,
  loginGoodImages,
  pickImageByName,
  registerBadImages,
  registerBadPasswdImages,
  registerBlankImages,
  registerGoodImages,
  settingsImages,
} from '../screens/tutorialHelpers'

const expectedHelpFilenames = [
  'helpHome.png',
  'helpRegister.png',
  'helpLogin.png',
  'helpGame.png',
  'home.png',
  'idiomaButton.png',
  'settings.png',
  'registerBlank.png',
  'registerBad.png',
  'registerBadPasswd.png',
  'registerGood.png',
  'loginBlank.png',
  'loginErrorBadUsernamePswd.png',
  'loginErrorServer.png',
  'loginGood.png',
  'gameNav.png',
  'gamePoints.png',
  'gameSize.png',
  'gameDifficult.png',
  'gameTemporizator.png',
  'gameInGame.png',
  'gameViewMyProfile.png',
  'gameFriends.png',
  'gameHistorial.png',
  'gameEnded.png',
  'gameWin.png',
  'gameLose.png',
]

describe('TutorialScreen helpers', () => {
  test('allHelpImages incluye las capturas de ayuda esperadas', () => {
    const names = allHelpImages.map((image) => image.name)
    expect(names).toEqual(expect.arrayContaining(expectedHelpFilenames))
  })

  test.each([
    ['helpHome.png', helpHomeImages],
    ['helpRegister.png', helpRegisterImages],
    ['helpLogin.png', helpLoginImages],
    ['helpGame.png', helpGameImages],
    ['home.png', homeImages],
    ['idiomaButton.png', languageImages],
    ['settings.png', settingsImages],
    ['registerBlank.png', registerBlankImages],
    ['registerBad.png', registerBadImages],
    ['registerBadPasswd.png', registerBadPasswdImages],
    ['registerGood.png', registerGoodImages],
    ['loginBlank.png', loginBlankImages],
    ['loginErrorBadUsernamePswd.png', loginErrorBadUsernamePswdImages],
    ['loginErrorServer.png', loginErrorServerImages],
    ['loginGood.png', loginGoodImages],
    ['gameNav.png', gameNavImages],
    ['gamePoints.png', gamePointsImages],
    ['gameSize.png', gameSizeImages],
    ['gameDifficult.png', gameDifficultImages],
    ['gameTemporizator.png', gameTemporizatorImages],
    ['gameInGame.png', gameInGameImages],
    ['gameViewMyProfile.png', gameViewMyProfileImages],
    ['gameFriends.png', gameFriendsImages],
    ['gameHistorial.png', gameHistorialImages],
    ['gameEnded.png', gameEndedImages],
    ['gameWin.png', gameWinImages],
    ['gameLose.png', gameLoseImages],
  ])('pickImageByName devuelve la captura correcta para %s', (fileName, images) => {
    const picked = pickImageByName(fileName)
    expect(picked).toEqual(images)
    expect(picked).toHaveLength(1)
    expect(picked[0]?.name).toBe(fileName)
  })

  test.each([
    ['registerBad.png', 'Campos vacíos'],
    ['registerBlank.png', 'Formulario vacío'],
    ['registerBadPasswd.png', 'Error de contraseña'],
    ['registerGood.png', 'Formulario correcto'],
    ['settings.png', 'Ajustes'],
    ['home.png', 'Pantalla de inicio'],
    ['helpHome.png', 'Pantalla de inicio'],
    ['helpRegister.png', 'Pantalla de registro'],
    ['helpLogin.png', 'Pantalla de inicio de sesión'],
    ['helpGame.png', 'Ventana de juego'],
    ['idiomaButton.png', 'Idioma'],
    ['loginBlank.png', 'Formulario vacío'],
    ['loginErrorBadUsernamePswd.png', 'Error de datos'],
    ['loginErrorServer.png', 'Error de servidor'],
    ['loginGood.png', 'Inicio correcto'],
    ['gameNav.png', 'Barra superior del juego'],
    ['gamePoints.png', 'Puntos acumulados'],
    ['gameSize.png', 'Tamaño de la partida'],
    ['gameDifficult.png', 'Dificultad de la partida'],
    ['gameTemporizator.png', 'Temporizador del turno'],
    ['gameInGame.png', 'Tablero de juego'],
    ['gameViewMyProfile.png', 'Perfil del jugador'],
    ['gameFriends.png', 'Amigos y salida'],
    ['gameHistorial.png', 'Historial de partidas'],
    ['gameEnded.png', 'Fin de partida'],
    ['gameWin.png', 'Ventana de victoria'],
    ['gameLose.png', 'Ventana de derrota'],
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

    expect(screen.getByRole('dialog', { name: /ayuda sobre esta web/i })).toBeInTheDocument()
    expect(screen.getByText(/ayuda sobre esta web/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /1\. ventana de inicio/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /2\. ventana de registro/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /3\. ventana de inicio de sesión/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /4\. ventana de juego/i })).toBeInTheDocument()

    expectedHelpFilenames.forEach((fileName) => {
      expect(screen.getAllByAltText(fileName).length).toBeGreaterThan(0)
    })
  })

  test('los botones del índice desplazan a sus secciones', () => {
    render(<TutorialScreen isOpen onClose={vi.fn()} />)

    const buttonsToClick = [
      /1\. ventana de inicio/i,
      /1\.1 ajustes/i,
      /1\.2 captura de referencia/i,
      /1\.3 idioma/i,
      /1\.4 ayuda/i,
      /2\. ventana de registro/i,
      /2\.1 formulario vacío/i,
      /2\.2 campos vacíos/i,
      /2\.3 error de contraseña/i,
      /2\.4 formulario correcto/i,
      /2\.5 idioma/i,
      /2\.6 ajustes/i,
      /2\.7 ayuda/i,
      /3\. ventana de inicio de sesión/i,
      /3\.1 formulario vacío/i,
      /3\.2 error de datos/i,
      /3\.3 error de servidor/i,
      /3\.4 inicio correcto/i,
      /3\.5 idioma/i,
      /3\.6 ajustes/i,
      /3\.7 ayuda/i,
      /4\. ventana de juego/i,
      /4\.1 barra superior/i,
      /4\.2 tamaño de partida/i,
      /4\.3 dificultad/i,
      /4\.4 puntos acumulados/i,
      /4\.5 temporizador por turno/i,
      /4\.6 tablero y celdas/i,
      /4\.7 panel de información/i,
      /4\.8 perfil, amigos y salida/i,
      /4\.9 historial de partidas/i,
      /4\.10 fin de partida/i,
      /4\.11 victoria/i,
      /4\.12 derrota/i,
      /4\.13 ajustes y ayuda/i,
    ]

    buttonsToClick.forEach((name) => {
      fireEvent.click(screen.getByRole('button', { name }))
    })

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(buttonsToClick.length)
  })

  test.each([
    ['settings.png', 'No se pudo cargar: Ajustes'],
    ['home.png', 'No se pudo cargar: Pantalla de inicio'],
  ])('muestra caption de fallback para %s', (fileName, expectedCaption) => {
    render(<TutorialScreen isOpen onClose={vi.fn()} />)

    const image = screen.getAllByAltText(fileName)[0]
    fireEvent.error(image)

    expect(screen.getByText(expectedCaption)).toBeInTheDocument()
  })
})
