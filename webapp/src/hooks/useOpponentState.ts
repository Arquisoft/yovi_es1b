import { useMemo } from 'react';
import { OpponentState } from '../types/opponent';
import type { RivalInfo } from '../providers/GameProvider';

/**
 * Hook para gestionar el estado del oponente en la partida
 * SOLID:
 * - Single Responsibility: Solo gestiona la lógica de estado del oponente
 * - Interface Segregation: Expone solo lo necesario para que el componente funcione
 * - Dependency Inversion: Depende de callbacks y eventos, no de implementaciones
 */

export interface UseOpponentStateProps {
  /** Modo de juego actual */
  gameMode: 'bot' | 'multiplayer' | null;

  /** Estado de conexión del socket */
  socketConnection: 'connecting' | 'connected' | 'disconnected';

  /** Información del rival cuando está disponible */
  rivalInfo: RivalInfo | null;

  /** Indicador de si es el turno del oponente */
  isOpponentTurn: boolean;
}

/**
 * Calcula el estado actual del oponente basado en los inputs
 * Usa useMemo para evitar recálculos innecesarios
 */
export const useOpponentState = ({
  gameMode,
  socketConnection,
  rivalInfo,
  isOpponentTurn,
}: UseOpponentStateProps) => {
  // Determinar el estado del oponente como derivación pura de los inputs
  const opponentState = useMemo<typeof OpponentState[keyof typeof OpponentState]>(() => {
    if (gameMode !== 'multiplayer') {
      return OpponentState.WAITING;
    }

    if (socketConnection === 'disconnected' || socketConnection === 'connecting') {
      return OpponentState.WAITING;
    }

    if (socketConnection === 'connected' && rivalInfo?.name) {
      return OpponentState.CONNECTED;
    }

    if (socketConnection === 'connected' && !rivalInfo?.name) {
      return OpponentState.CONNECTING;
    }

    return OpponentState.WAITING;
  }, [gameMode, socketConnection, rivalInfo?.name, rivalInfo?.icon]);

  return {
    opponentState,
    opponentName: rivalInfo?.name || null,
    opponentIcon: rivalInfo?.icon || null,
    isOpponentTurn,
  };
};

