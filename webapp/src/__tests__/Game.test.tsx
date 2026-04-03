import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

// Función para generar las props necesarias para el test
const baseProps = (overrides?: {
  difficultyChoice?: Difficulty
  selectedBoardDimension?: number | null
  boardData?: GameYData | null
  winner?: number | null
  timerVisible?: boolean
  turnTimeLeft?: number | null
  turnTimeLimit?: number | null
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
  connectionStatus: 'Conectado', // Prop requerida en el nuevo GameScreen
  sizeLabel: 'Tamaño 6x6x6',
  timerVisible: overrides?.timerVisible ?? false,
  turnTimeLeft: overrides?.turnTimeLeft ?? null,
  turnTimeLimit: overrides?.turnTimeLimit ?? null,
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
})

describe('Game UI (MPA Ready)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('los botones principales ejecutan sus callbacks', async () => {
    const user = userEvent.setup()
    const props = baseProps()

    render(<GameScreen {...props} />)

    // Simulamos clics en la botonera de la Navbar
    await user.click(screen.getByRole('button', { name: /historial/i }))
    // 1. Cambiar Dificultad
    // Hacemos clic en el botón que abre el menú
    await user.click(screen.getByText(/Dificultad: facil/i))
    // Luego hacemos clic en la opción que queremos
    await user.click(screen.getByText(/^Facil$/i))

    // 2. Cambiar Tamaño
    // Hacemos clic en el botón de "Cambiar Tamaño"
    await user.click(screen.getByText(/Cambiar Tamaño/i))
    // Luego seleccionamos el tamaño deseado de la lista que aparece
    await user.click(screen.getByText(/Tamaño 9x9x9/i))
    await user.click(screen.getByRole('button', { name: /terminar partida/i }))
    await user.click(screen.getByRole('button', { name: /reiniciar/i }))
    await user.click(screen.getByRole('button', { name: /salir/i }))
    await user.click(screen.getByRole('button', { name: /ver mi perfil/i }))

    expect(props.onFetchHistory).toHaveBeenCalled()
    expect(props.onChangeDifficulty).toHaveBeenCalled()
    expect(props.onChangeSize).toHaveBeenCalled()
    expect(props.onEndGame).toHaveBeenCalled()
    expect(props.onResetGame).toHaveBeenCalled()
    expect(props.onExit).toHaveBeenCalled()
    expect(props.onViewProfile).toHaveBeenCalled()
  })

  test('una celda vacia dispara el callback de movimiento', async () => {
    const user = userEvent.setup()
    const props = baseProps()

    render(<GameScreen {...props} />)

    // El nombre de la celda en el aria-label suele ser "Celda X"
    await user.click(screen.getByRole('button', { name: /celda 0/i }))

    expect(props.onCellClick).toHaveBeenCalledWith(0)
  })

  test('si la partida esta terminada, no permite pulsar celdas', async () => {
    const props = baseProps({ winner: 1 }) // Simulamos que alguien ya ganó

    render(<GameScreen {...props} />)

    const cell0 = screen.getByRole('button', { name: /celda 0/i })
    expect(cell0).toBeDisabled()
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
      }
    })

    render(<GameScreen {...props} />)

    // Verificamos que los textos de las fichas aparecen en los botones
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getByText('R')).toBeInTheDocument()
  })

  test('muestra el texto de modo y el icono de perfil en el nav', () => {
    const props = baseProps()
    render(<GameScreen {...props} />)

    expect(screen.getByText(/partida personalizada contra un bot/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /jugador:/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /ver mi perfil/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /amigos/i })).toBeInTheDocument()
  })
})
describe('Temporizador — renderizado en GameScreen', () => {

  // ── Visibilidad ──────────────────────────────

  test('no muestra el temporizador cuando timerVisible es false', () => {
    render(<GameScreen {...baseProps({ timerVisible: false })} />)

    expect(screen.queryByText(/tu turno/i)).not.toBeInTheDocument()
  })

  test('no muestra el temporizador cuando turnTimeLimit es null aunque timerVisible sea true', () => {
    // Sin límite definido no hay barra que mostrar
    render(<GameScreen {...baseProps({ timerVisible: true, turnTimeLeft: 30, turnTimeLimit: null })} />)

    expect(screen.queryByText(/tu turno/i)).not.toBeInTheDocument()
  })

  test('no muestra el temporizador cuando la partida ha terminado (winner != null)', () => {
    // Aunque timerVisible sea true, si hay ganador el timer no debe aparecer
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

  // ── Valores mostrados ────────────────────────

  test('muestra correctamente los segundos restantes', () => {
    render(
        <GameScreen
            {...baseProps({ timerVisible: true, turnTimeLeft: 42, turnTimeLimit: 60 })}
        />
    )

    expect(screen.getByText(/42s/i)).toBeInTheDocument()
  })

  test('si no hay boardData muestra mensaje de carga', () => {
    const props = baseProps({ boardData: null })
    render(<GameScreen {...props} />)
    expect(screen.getByText(/carga el tablero para comenzar/i)).toBeInTheDocument()
  })

  test('muestra 0s cuando el tiempo se ha agotado', () => {
    render(
        <GameScreen
            {...baseProps({ timerVisible: true, turnTimeLeft: 0, turnTimeLimit: 60 })}
        />
    )

    expect(screen.getByText(/0s/i)).toBeInTheDocument()
  })

  // ── Estado de "urgencia" (≤ 5 segundos) ────────

  test('aplica la clase de urgencia cuando quedan 5 segundos o menos', () => {
    render(
        <GameScreen
            {...baseProps({ timerVisible: true, turnTimeLeft: 5, turnTimeLimit: 60 })}
        />
    )

    // El span de segundos debe tener la clase "turn-timer-urgent"
    const segundosEl = screen.getByText(/5s/i)
    expect(segundosEl).toHaveClass('turn-timer-urgent')
  })

  test('aplica la clase de urgencia en la barra cuando quedan 3 segundos', () => {
    render(
        <GameScreen
            {...baseProps({ timerVisible: true, turnTimeLeft: 3, turnTimeLimit: 60 })}
        />
    )

    // El div de la barra debe tener la clase "turn-timer-bar-urgent"
    const barra = document.querySelector('.turn-timer-bar')
    expect(barra).toHaveClass('turn-timer-bar-urgent')
  })

  test('NO aplica la clase de urgencia cuando quedan más de 5 segundos', () => {
    render(
        <GameScreen
            {...baseProps({ timerVisible: true, turnTimeLeft: 20, turnTimeLimit: 60 })}
        />
    )

    const segundosEl = screen.getByText(/20s/i)
    expect(segundosEl).not.toHaveClass('turn-timer-urgent')
  })

  // ── Anchura de la barra de progreso ──────────

  test('la barra de progreso ocupa el 100% al inicio', () => {
    render(
        <GameScreen
            {...baseProps({ timerVisible: true, turnTimeLeft: 60, turnTimeLimit: 60 })}
        />
    )

    const barra = document.querySelector('.turn-timer-bar') as HTMLElement
    expect(barra.style.width).toBe('100%')
  })

  test('la barra de progreso ocupa el 50% a mitad del tiempo', () => {
    render(
        <GameScreen
            {...baseProps({ timerVisible: true, turnTimeLeft: 30, turnTimeLimit: 60 })}
        />
    )

    const barra = document.querySelector('.turn-timer-bar') as HTMLElement
    expect(barra.style.width).toBe('50%')
  })

  test('la barra de progreso ocupa el 0% cuando el tiempo se acaba', () => {
    render(
        <GameScreen
            {...baseProps({ timerVisible: true, turnTimeLeft: 0, turnTimeLimit: 60 })}
        />
    )

    const barra = document.querySelector('.turn-timer-bar') as HTMLElement
    expect(barra.style.width).toBe('0%')
  })

  // ── Distintos límites de tiempo por dificultad ─

  test.each([
    { difficulty: 'facil',   turnTimeLimit: 60, turnTimeLeft: 45, expectedWidth: '75%' },
    { difficulty: 'medio',   turnTimeLimit: 30, turnTimeLeft: 15, expectedWidth: '50%' },
    { difficulty: 'dificil', turnTimeLimit: 15, turnTimeLeft: 3,  expectedWidth: '20%' },
  ])(
      'barra correcta para dificultad $difficulty con $turnTimeLeft/$turnTimeLimit segundos',
      ({ difficulty, turnTimeLimit, turnTimeLeft, expectedWidth }) => {
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

        const barra = document.querySelector('.turn-timer-bar') as HTMLElement
        expect(barra.style.width).toBe(expectedWidth)
      }
  )
})