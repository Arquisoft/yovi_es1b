import { render, screen, within, fireEvent } from '@testing-library/react'
import { describe, expect, test, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom'
import GameScreen from '../screens/GameScreen'

type Difficulty = 'facil' | 'medio' | 'dificil' | null

interface GameYData {
  size: number
  turn: number
  players: string[]
  layout: string
}

const makeTriangularLayout = (size: number, fill = '.'): string =>
  Array.from({ length: size }, (_, row) => fill.repeat(row + 1)).join('/')

const baseProps = (overrides?: {
  difficultyChoice?: Difficulty
  selectedBoardDimension?: number | null
  boardData?: GameYData | null
  winner?: number | null
  timerVisible?: boolean
  turnTimeLeft?: number | null
  turnTimeLimit?: number | null
  totalScore?: number
}) => ({
  username: 'Alice',
  displayName: 'Ali',
  playerIcon: 'https://example.com/avatar.png',
  difficultyChoice: overrides?.difficultyChoice ?? 'facil',
  selectedBoardDimension: overrides?.selectedBoardDimension ?? 6,
  boardData:
    overrides && 'boardData' in overrides
      ? (overrides.boardData ?? null)
      : ({
          size: 6,
          turn: 0,
          players: ['B', 'R'],
          layout: makeTriangularLayout(6),
        } as GameYData),
  winner: overrides?.winner ?? null,
  sizeLabel: 'Pequeño',
  timerVisible: overrides?.timerVisible ?? false,
  turnTimeLeft: overrides?.turnTimeLeft ?? null,
  turnTimeLimit: overrides?.turnTimeLimit ?? null,
  totalScore: overrides?.totalScore ?? 0,
  onFetchHistory: vi.fn(),
  onChangeDifficulty: vi.fn(),
  onChangeSize: vi.fn(),
  onCellClick: vi.fn(),
  onEndGame: vi.fn(),
  onResetGame: vi.fn(),
  onExit: vi.fn(),
  onAddFriend: vi.fn(),
  onViewProfile: vi.fn(),
  onOpenSettings: vi.fn(),
  onScoreButtonClick: vi.fn(),
})

describe('Game UI (MPA Ready)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('los botones principales ejecutan sus callbacks', () => {
    const props = baseProps()

    const { rerender } = render(<GameScreen {...props} />)

    fireEvent.click(screen.getByTitle(/ver historial/i))
    expect(props.onFetchHistory).toHaveBeenCalled()

    expect(screen.getByRole('button', { name: /dificultad/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /tamaño/i })).toBeEnabled()

    rerender(<GameScreen {...props} gameStarted={true} />)
    fireEvent.click(screen.getByTitle(/terminar partida/i))
    expect(props.onEndGame).toHaveBeenCalled()

    fireEvent.click(screen.getByTitle(/reiniciar partida/i))
    expect(props.onResetGame).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /ver perfil/i }))
    expect(props.onViewProfile).toHaveBeenCalled()

    fireEvent.click(screen.getByTitle(/cerrar sesion/i))
    expect(props.onExit).toHaveBeenCalled()
  })

  test('si el reinicio esta bloqueado, el boton de reiniciar queda deshabilitado', () => {
    const props = baseProps()

    render(<GameScreen {...props} restartDisabled />)

    const restartButton = screen.getByTitle(/reiniciar partida/i)
    expect(restartButton).toBeDisabled()

    fireEvent.click(restartButton)
    expect(props.onResetGame).not.toHaveBeenCalled()
  })

  test('una celda vacia dispara el callback de movimiento', () => {
    const props = baseProps()

    render(<GameScreen {...props} />)

    fireEvent.click(screen.getByRole('button', { name: /celda 0/i }))

    expect(props.onCellClick).toHaveBeenCalledWith(0)
  })

  test('si la partida esta terminada, no permite pulsar celdas', () => {
    const props = baseProps({ winner: 1 })

    render(<GameScreen {...props} />)

    const cell0 = screen.getByRole('button', { name: /celda 0/i })
    expect(cell0).toBeDisabled()
  })

  test('si la partida termina, habilita los desplegables de formato y dificultad', () => {
    const props = baseProps({ winner: 1 })

    render(<GameScreen {...props} gameStarted={true} />)

    expect(screen.getByRole('button', { name: /dificultad/i })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: /tamaño/i })).not.toBeDisabled()
  })

  test('no permite rendirse antes de pulsar la primera celda', () => {
    const props = baseProps()

    render(<GameScreen {...props} gameStarted={false} />)

    expect(screen.getByTitle(/terminar partida/i)).toBeDisabled()
  })

  test('muestra el temporizador correctamente', () => {
    const props = {
      ...baseProps(),
      timerVisible: true,
      turnTimeLeft: 45,
      turnTimeLimit: 60,
    }

    render(<GameScreen {...props} />)

    expect(screen.getByText(/tu turno/i)).toBeInTheDocument()
    expect(screen.getByText(/45s/i)).toBeInTheDocument()
  })

  test('renderiza las fichas (B y R) en el tablero', () => {
    const props = baseProps({
      selectedBoardDimension: 3,
      boardData: {
        size: 3,
        turn: 0,
        players: ['B', 'R'],
        layout: 'B/R./...',
      },
    })

    render(<GameScreen {...props} />)

    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getByText('R')).toBeInTheDocument()
  })

  test('muestra el texto de modo y el icono de perfil en el nav', () => {
    const props = baseProps()
    render(<GameScreen {...props} />)

    const navbar = screen.getByRole('navigation')
    expect(within(navbar).getByText(/mis puntos/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ver perfil/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /amigos/i })).toBeInTheDocument()
  })

  test('en multijugador permite elegir tamano y dificultad y muestra espera del rival', () => {
    const props = baseProps({
      boardData: {
        size: 3,
        turn: 0,
        players: ['B', 'R'],
        layout: '.../....',
      },
    })

    render(
      <GameScreen
        {...props}
        gameMode="multiplayer"
        isPlayerTurn={false}
        isOpponentTurn={false}
        opponentDisplayName="  "
        gameStarted={false}
        onGoToModeMenu={vi.fn()}
      />
    )

    expect(screen.getByText('Esperando rival')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /tama/i }))
    fireEvent.click(screen.getByRole('button', { name: /mediano/i }))
    expect(props.onChangeSize).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /dificultad/i }))
    fireEvent.click(screen.getByRole('button', { name: /medio/i }))
    expect(props.onChangeDifficulty).toHaveBeenCalledWith('Medio')
  })

  test('cierra el desplegable con escape', () => {
    render(<GameScreen {...baseProps()} gameStarted={false} />)

    fireEvent.click(screen.getByRole('button', { name: /tama/i }))
    expect(screen.getByRole('button', { name: /mediano/i })).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('button', { name: /mediano/i })).not.toBeInTheDocument()
  })
})

describe('Temporizador - renderizado en GameScreen', () => {
  test('no muestra el temporizador cuando timerVisible es false', () => {
    render(<GameScreen {...baseProps({ timerVisible: false })} />)

    expect(screen.queryByText(/tu turno/i)).not.toBeInTheDocument()
  })

  test('no muestra el temporizador cuando turnTimeLimit es null aunque timerVisible sea true', () => {
    render(<GameScreen {...baseProps({ timerVisible: true, turnTimeLeft: 30, turnTimeLimit: null })} />)

    expect(screen.queryByText(/tu turno/i)).not.toBeInTheDocument()
  })

  test('no muestra el temporizador cuando la partida ha terminado (winner != null)', () => {
    render(
      <GameScreen
        {...baseProps({
          timerVisible: true,
          turnTimeLeft: 20,
          turnTimeLimit: 60,
          winner: 0,
        })}
      />
    )

    expect(screen.queryByText(/tu turno/i)).not.toBeInTheDocument()
  })

  test('muestra correctamente los segundos restantes', () => {
    render(<GameScreen {...baseProps({ timerVisible: true, turnTimeLeft: 42, turnTimeLimit: 60 })} />)

    expect(screen.getByText(/42s/i)).toBeInTheDocument()
  })

  test('si no hay boardData muestra mensaje de carga', () => {
    const props = baseProps({ boardData: null })
    render(<GameScreen {...props} />)
    expect(screen.getByText(/carga el tablero para comenzar/i)).toBeInTheDocument()
  })

  test('muestra 0s cuando el tiempo se ha agotado', () => {
    render(<GameScreen {...baseProps({ timerVisible: true, turnTimeLeft: 0, turnTimeLimit: 60 })} />)

    expect(screen.getByText(/0s/i)).toBeInTheDocument()
  })

  test('aplica la clase de urgencia cuando quedan 5 segundos o menos', () => {
    render(<GameScreen {...baseProps({ timerVisible: true, turnTimeLeft: 5, turnTimeLimit: 60 })} />)

    const segundosEl = screen.getByText(/5s/i)
    expect(segundosEl).toHaveClass('turn-timer-urgent')
  })

  test('aplica la clase de urgencia en la barra cuando quedan 3 segundos', () => {
    render(<GameScreen {...baseProps({ timerVisible: true, turnTimeLeft: 3, turnTimeLimit: 60 })} />)

    const barra = document.querySelector('.turn-timer-progress')
    expect(barra).toHaveClass('turn-timer-progress-urgent')
  })

  test('NO aplica la clase de urgencia cuando quedan mas de 5 segundos', () => {
    render(<GameScreen {...baseProps({ timerVisible: true, turnTimeLeft: 20, turnTimeLimit: 60 })} />)

    const segundosEl = screen.getByText(/20s/i)
    expect(segundosEl).not.toHaveClass('turn-timer-urgent')
  })

  test('la barra de progreso ocupa el 100% al inicio', () => {
    render(<GameScreen {...baseProps({ timerVisible: true, turnTimeLeft: 60, turnTimeLimit: 60 })} />)

    const barra = document.querySelector('.turn-timer-progress') as HTMLProgressElement
    expect(barra.value).toBe(60)
    expect(barra.max).toBe(60)
  })

  test('la barra de progreso ocupa el 50% a mitad del tiempo', () => {
    render(<GameScreen {...baseProps({ timerVisible: true, turnTimeLeft: 30, turnTimeLimit: 60 })} />)

    const barra = document.querySelector('.turn-timer-progress') as HTMLProgressElement
    expect(barra.value).toBe(30)
    expect(barra.max).toBe(60)
  })

  test('la barra de progreso ocupa el 0% cuando el tiempo se acaba', () => {
    render(<GameScreen {...baseProps({ timerVisible: true, turnTimeLeft: 0, turnTimeLimit: 60 })} />)

    const barra = document.querySelector('.turn-timer-progress') as HTMLProgressElement
    expect(barra.value).toBe(0)
    expect(barra.max).toBe(60)
  })

  test.each([
    { difficulty: 'facil', turnTimeLimit: 60, turnTimeLeft: 45 },
    { difficulty: 'medio', turnTimeLimit: 30, turnTimeLeft: 15 },
    { difficulty: 'dificil', turnTimeLimit: 15, turnTimeLeft: 3 },
  ])(
    'barra correcta para dificultad $difficulty con $turnTimeLeft/$turnTimeLimit segundos',
    ({ difficulty, turnTimeLimit, turnTimeLeft }) => {
      render(
        <GameScreen
          {...baseProps({
            difficultyChoice: difficulty as Difficulty,
            timerVisible: true,
            turnTimeLeft,
            turnTimeLimit,
          })}
        />
      )

      const barra = document.querySelector('.turn-timer-progress') as HTMLProgressElement
      expect(barra.value).toBe(turnTimeLeft)
      expect(barra.max).toBe(turnTimeLimit)
    }
  )
})
