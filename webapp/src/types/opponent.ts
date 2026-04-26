/**
 * Tipos y enums para el componente OpponentCard
 * Separados del componente para cumplir con best practices de React
 */

/**  Estado del oponente */
export const OpponentState = {
  WAITING: 'waiting' as const,
  CONNECTING: 'connecting' as const,
  CONNECTED: 'connected' as const,
  DISCONNECTED: 'disconnected' as const,
} as const;

export type OpponentState = (typeof OpponentState)[keyof typeof OpponentState];

export interface OpponentCardProps {
  state: OpponentState;
  opponentName: string | null;
  opponentIcon: string | null;
  onInviteFriend: () => void;
  isOpponentTurn?: boolean;
}

