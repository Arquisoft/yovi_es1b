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

    // 1. Historial (Usamos el title del botón)
    await user.click(screen.getByTitle(/ver historial/i))
    expect(props.onFetchHistory).toHaveBeenCalled()

    // 2. Cambiar Dificultad
    // Primero abrimos el menú (buscamos el disparador específico del Nav)
    const triggerDificultad = screen.getByText(/Dificultad: ▾/i)
    await user.click(triggerDificultad)
    
    // Buscamos "Facil" (exacto, sin tilde como en tu .map) dentro de los dropdown-items
    const opcionFacil = await screen.findByText(/^Facil$/) 
    await user.click(opcionFacil)
    expect(props.onChangeDifficulty).toHaveBeenCalledWith('facil')

    // 3. Cambiar Tamaño
    const triggerTamaño = screen.getByText(/Cambiar Tamaño ▾/i)
    await user.click(triggerTamaño)
    
    // Buscamos la opción 9x9x9 que está en tus SIZE_OPTIONS
    const opcionTamaño = await screen.findByText(/Tamaño 9x9x9/i)
    await user.click(opcionTamaño)
    expect(props.onChangeSize).toHaveBeenCalledWith('Tamaño 9x9x9')

    // 4. Terminar Partida (por title)
    await user.click(screen.getByTitle(/terminar partida/i))
    expect(props.onEndGame).toHaveBeenCalled()

    // 5. Reiniciar (por title)
    await user.click(screen.getByTitle(/reiniciar partida/i))
    expect(props.onResetGame).toHaveBeenCalled()

    // 6. Perfil (por title)
    await user.click(screen.getByTitle(/ver mi perfil/i))
    expect(props.onViewProfile).toHaveBeenCalled()

    // 7. Salir (por title)
    await user.click(screen.getByTitle(/volver al menú/i))
    expect(props.onExit).toHaveBeenCalled()
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
