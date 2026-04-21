export type Screen = 'home' | 'register' | 'login' | 'game';
export type DifficultyChoice = string; // Ahora es string dinamico

export const SIZE_OPTIONS = ['Pequeño', 'Mediano', 'Grande'] as const;
export type SizeChoice = typeof SIZE_OPTIONS[number];

// Definicion de tipos

/**
 * Interfaz para representar los datos de un juego, incluyendo el tamano del tablero,
 * el turno actual, los jugadores involucrados y la disposicion del tablero.
 */
export interface GameYData {
  size: number;
  turn: number;
  players: string[];
  layout: string;
  score: number;
}

/**
 * Interfaz para representar un registro de juego en el historial, incluyendo detalles
 * como la fecha, oponente, tamano del tablero, dificultad y resultado.
 */
export interface HistoryGameRecord {
  _id?: { $oid: string };
  date: string;
  opponent: string;
  board_size: number;
  board_label?: string;
  difficulty: string;
  result: string;
  result_label?: string;
  locale?: string;
  score?: number;
}

/**
 * Interfaz para el perfil publico de un usuario, que incluye informacion basica
 * y estadisticas de juego.
 */
export interface PublicProfile {
  username: string;
  displayName: string;
  icon: string | null;
  stats: {
    gamesPlayed: number;
    losses: number;
    winRate: number;
    totalScore: number;
  };
  isFollowing: boolean;
}
