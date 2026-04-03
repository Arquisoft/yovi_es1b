export type Screen = 'home' | 'register' | 'login' | 'game';
export type DifficultyChoice = string; // Ahora es string dinámico

export const SIZE_OPTIONS = ['Tamaño 6x6x6', 'Tamaño 9x9x9', 'Tamaño 12x12x12'] as const;
export type SizeChoice = typeof SIZE_OPTIONS[number];


// Definición de tipos
export interface GameYData {
  size: number;
  turn: number;
  players: string[];
  layout: string;
}

export interface HistoryGameRecord {
  _id?: { $oid: string };
  date: string;
  opponent: string;
  board_size: number;
  difficulty: string;
  result: string;
}
