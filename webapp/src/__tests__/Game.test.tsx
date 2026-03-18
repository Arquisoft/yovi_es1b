import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
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
}) => ({
  username: 'Alice',
  difficultyChoice: overrides?.difficultyChoice ?? 'facil',
  selectedBoardDimension: overrides?.selectedBoardDimension ?? 6,
  boardData:
    overrides?.boardData ??
    ({
      size: 6,
      turn: 0,
      players: ['B', 'R'],
      layout: makeTriangularLayout(6),
    } as GameYData),
  winner: overrides?.winner ?? null,
  connectionStatus: 'Partida iniciada!',
  difficulty: overrides?.difficultyChoice ?? 'facil',
  sizeLabel: 'Tamaño 6x6x6',
  timerVisible: false,
  onFetchHistory: vi.fn(),
  onChangeDifficulty: vi.fn(),
  onChangeSize: vi.fn(),
  turnTimeLeft: null,
  turnTimeLimit: null,
  onCellClick: vi.fn(),
  onEndGame: vi.fn(),
  onResetGame: vi.fn(),
  onExit: vi.fn(),
})

describe('Game UI', () => {
  test('los botones principales ejecutan sus callbacks', async () => {
    const user = userEvent.setup()
    const props = baseProps()

    render(<GameScreen {...props} />)

    await user.click(screen.getByRole('button', { name: /historial/i }))
    await user.click(screen.getByRole('button', { name: /dificultad/i }))
    await user.click(screen.getByRole('button', { name: /tamaño/i }))
    await user.click(screen.getByRole('button', { name: /rendirse/i }))
    await user.click(screen.getByRole('button', { name: /reiniciar partida/i }))
    await user.click(screen.getByRole('button', { name: /salir/i }))

    expect(props.onChangeDifficulty).toHaveBeenCalledTimes(1)
    expect(props.onChangeSize).toHaveBeenCalledTimes(1)
    expect(props.onEndGame).toHaveBeenCalledTimes(1)
    expect(props.onResetGame).toHaveBeenCalledTimes(1)
    expect(props.onExit).toHaveBeenCalledTimes(1)
  })

  test('una celda vacia dispara el callback de movimiento', async () => {
    const user = userEvent.setup()
    const props = baseProps()

    render(<GameScreen {...props} />)

    await user.click(screen.getByRole('button', { name: /celda 0/i }))

    expect(props.onCellClick).toHaveBeenCalledTimes(1)
    expect(props.onCellClick).toHaveBeenCalledWith(0)
  })

  test('si la partida esta terminada, no permite pulsar celdas', async () => {
    const props = baseProps({ winner: 1 })

    render(<GameScreen {...props} />)

    const cell0 = screen.getByRole('button', { name: /celda 0/i })
    expect(cell0).toBeDisabled()
  })

  test.each([
    { size: 6, expectedCells: 21 },
    { size: 9, expectedCells: 45 },
    { size: 12, expectedCells: 78 },
  ])(
    'segun el tamano seleccionado ($size), cambia la cantidad de celdas del tablero',
    ({ size, expectedCells }) => {
      const props = baseProps({
        selectedBoardDimension: size,
        boardData: {
          size,
          turn: 0,
          players: ['B', 'R'],
          layout: makeTriangularLayout(size),
        },
      })

      render(<GameScreen {...props} />)

      const cellButtons = screen.getAllByRole('button', { name: /celda \d+/i })
      expect(cellButtons).toHaveLength(expectedCells)
    }
  )


  test('las celdas ocupadas no disparan el callback de movimiento', async () => {
    const user = userEvent.setup()
    // Simulamos un tablero de tamaño 3. Layout: "B/R./..." (Fila 1: Black, Fila 2: Red, Vacia...)
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

    // Buscamos la celda 0 (que según el layout es 'B')
    const celdaOcupada = screen.getByRole('button', { name: /celda 0/i })
    await user.click(celdaOcupada)

    // El callback NO debe llamarse porque la celda ya tiene dueño
    expect(props.onCellClick).not.toHaveBeenCalled()
    // Opcional: Si en tu código deshabilitas el botón cuando está ocupado, testea esto:
    // expect(celdaOcupada).toBeDisabled()
  })

  test('muestra el temporizador con el tiempo restante cuando timerVisible es true', () => {
    // Sobrescribimos las props por defecto para forzar la aparición del timer
    const props = {
      ...baseProps(),
      timerVisible: true,
      turnTimeLeft: 59,
      turnTimeLimit: 60, // Por si tu barra de progreso necesita el total para calcular el %
    }

    render(<GameScreen {...props} />)

    // Buscamos los textos exactos que salen en tu captura de pantalla
    expect(screen.getByText(/tu turno/i)).toBeInTheDocument()
    expect(screen.getByText(/59s/i)).toBeInTheDocument()
  })

  test('renderiza correctamente las fichas de los jugadores en el tablero', () => {
    // Creamos un layout pequeño a mano donde sabemos exactamente dónde están las fichas
    // Fila 1: 'B', Fila 2: 'R' y '.', Fila 3: todas '.'
    const layoutOcupado = 'B/R./...' 
    
    const props = baseProps({
      selectedBoardDimension: 3,
      boardData: {
        size: 3,
        turn: 0,
        players: ['B', 'R'],
        layout: layoutOcupado,
      }
    })

    render(<GameScreen {...props} />)

    // Asumiendo que tu componente GameScreen pinta el texto 'B' y 'R' dentro de los botones de las celdas
    // Si usas clases CSS en lugar de texto (ej. <button className="cell blue"></button>), 
    // tendrías que cambiar esto para buscar por clase.
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getByText('R')).toBeInTheDocument()
  })
})

