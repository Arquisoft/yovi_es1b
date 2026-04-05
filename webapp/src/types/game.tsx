export type Screen = 'home' | 'register' | 'login' | 'game';
export type DifficultyChoice = string; // Ahora es string dinámico

export const SIZE_OPTIONS = ['Tamaño 6x6x6', 'Tamaño 9x9x9', 'Tamaño 12x12x12'] as const;
export type SizeChoice = typeof SIZE_OPTIONS[number];


// Definición de tipos

/**
 * Interfaz para representar los datos de un juego, incluyendo el tamaño del tablero, el turno actual, los jugadores involucrados y la disposición del tablero.
 */
export interface GameYData {
  size: number;
  turn: number;
  players: string[];
  layout: string;
}

/**
 * Interfaz para representar un registro de juego en el historial, incluyendo detalles como la fecha, oponente, tamaño del tablero, dificultad y resultado.
 */
export interface HistoryGameRecord {
  _id?: { $oid: string };
  date: string;
  opponent: string;
  board_size: number;
  difficulty: string;
  result: string;
}

/**
 * Interfaz para el perfil público de un usuario, que incluye información básica y estadísticas de juego.
 */
export interface PublicProfile {
  username: string;
  displayName: string;
  icon: string | null;
  stats: {
    gamesPlayed: number;
    losses: number;
    winRate: number;
  };
  isFollowing: boolean;
}
