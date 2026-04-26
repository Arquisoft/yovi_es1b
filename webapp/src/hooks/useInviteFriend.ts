import { useCallback } from 'react';

/**
 * Hook personalizado para manejar la lógica de invitación de amigos
 * SOLID:
 * - Single Responsibility: Solo gestiona la invitación
 * - Dependency Inversion: Depende de callbacks inyectados, no de implementaciones concretas
 * - Interface Segregation: Interfaz mínima, solo expone lo necesario
 */

export interface UseInviteFriendDeps {
  /** Callback cuando se clickea el botón de invitar */
  onOpenFriendsPanel: () => void;

  /** Callback cuando se selecciona un amigo para invitar */
  onInviteFriend?: (friendUsername: string) => void;

  /** Indicador de si ya hay una invitación en progreso */
  isInviting?: boolean;
}

export const useInviteFriend = (deps: UseInviteFriendDeps) => {
  const { onOpenFriendsPanel, onInviteFriend, isInviting = false } = deps;

  const handleInviteClick = useCallback(() => {
    onOpenFriendsPanel();
  }, [onOpenFriendsPanel]);

  const handleSelectFriend = useCallback(
    (friendUsername: string) => {
      if (isInviting) return;
      onInviteFriend?.(friendUsername);
    },
    [isInviting, onInviteFriend]
  );

  return {
    handleInviteClick,
    handleSelectFriend,
    isInviting,
  };
};

