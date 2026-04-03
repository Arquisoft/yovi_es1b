import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom'
import GameScreen from '../screens/GameScreen'

// Definimos el tipo para que coincida con el componente
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
  timerVisible: false,
  turnTimeLeft: null,
  turnTimeLimit: null,
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

  test('si no hay boardData muestra mensaje de carga', () => {
    const props = baseProps({ boardData: null })
    render(<GameScreen {...props} />)
    expect(screen.getByText(/carga el tablero para comenzar/i)).toBeInTheDocument()
  })
})
