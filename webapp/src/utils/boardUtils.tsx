import type { SizeChoice } from '../types/game';

/**
 * Convierte el texto del boton en un numero
 * Ej: "Tamaño 6x6x6" => 6
 */
const getBoardDimensionFromSizeChoice = (choice: SizeChoice | null): number | null => {
  if (!choice) return null;
  if (choice.includes('6x6x6')) return 6;
  if (choice.includes('9x9x9')) return 9;
  if (choice.includes('12x12x12')) return 12;
  return null;
};

/**
 * Dibuja una ficha en el string del tablero.
 * El tablero viene de rust como una linea de texto. Esta función busca el indice 
 * que se ha pulsado y pone una 'B' azul para mostrar el movimiento.
 * @param layout 
 * @param size 
 * @param index 
 * @param value 
 * @returns 
 */
const patchTriangularLayoutCell = (
  layout: string,
  size: number,
  index: number,
  value: 'B' | 'R'
): string => {
  if (!Number.isFinite(size) || size <= 0) return layout;
  const totalCells = (size * (size + 1)) / 2;
  if (index < 0 || index >= totalCells) return layout;

  const flat = layout.replaceAll('/', '').padEnd(totalCells, '.').slice(0, totalCells).split('');
  flat[index] = value;

  const rows: string[] = [];
  let cursor = 0;
  // Reconstruye el layout con filas triangulares: 1,2,3...N celdas.
  for (let rowLen = 1; rowLen <= size; rowLen += 1) {
    rows.push(flat.slice(cursor, cursor + rowLen).join(''));
    cursor += rowLen;
  }
  return rows.join('/');
}


export { getBoardDimensionFromSizeChoice, patchTriangularLayoutCell };