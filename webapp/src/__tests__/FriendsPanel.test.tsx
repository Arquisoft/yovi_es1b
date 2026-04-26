import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { FriendsPanel } from '../components/modals/FriendsPanel';
import { gameService } from '../services/gameService';
import '@testing-library/jest-dom';

vi.mock('../services/gameService');
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('FriendsPanel Coverage & Logic', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    username: 'Drus',
    displayName: 'Drus',
    friendCode: 'Y-123',
    icon: 'avatar.png',
    onTriggerPublicProfile: vi.fn(),
    onInviteFriend: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    (gameService.getFriends as any).mockResolvedValue([]);
    (gameService.getPendingRequests as any).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('carga inicial y polling de 15s', async () => {
    vi.useFakeTimers();
    

    (gameService.getFriends as any).mockResolvedValue([{ username: 'Bob' }]);
    (gameService.getPendingRequests as any).mockResolvedValue([]);

    render(<FriendsPanel {...defaultProps} />);

 
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(gameService.getFriends).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });

    expect(gameService.getFriends).toHaveBeenCalledTimes(2);
    
    vi.useRealTimers();
  });

  test('gestiona el flujo de aceptar una solicitud de amistad', async () => {
    const user = userEvent.setup();
    // Simulamos que hay una solicitud para que el contador sea > 0
    (gameService.getPendingRequests as any).mockResolvedValue([{ id: 'req_123', from: 'Alice' }]);
    (gameService.respondToFriendRequest as any).mockResolvedValue({ ok: true });

    render(<FriendsPanel {...defaultProps} />);

    const btnNavRequests = await screen.findByText(/friends.pending_requests/i);
    await user.click(btnNavRequests);

    const btnAccept = await screen.findByText('✅');
    
    await user.click(btnAccept);

    expect(gameService.respondToFriendRequest).toHaveBeenCalledWith('req_123', 'accepted');
  });

  test('lanza alerta si falla al responder una solicitud', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    (gameService.getPendingRequests as any).mockResolvedValue([{ id: 'req_123', from: 'Alice' }]);
    (gameService.respondToFriendRequest as any).mockRejectedValueOnce(new Error('Fail'));

    render(<FriendsPanel {...defaultProps} />);

    // Navegamos a solicitudes
    await user.click(await screen.findByText(/friends.pending_requests/i));

    // Clic en el botón de aceptar (emoji ✅)
    const btnAccept = await screen.findByText('✅');
    await user.click(btnAccept);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('friends.alert_respond_error');
    });
  });

  test('cierra solo desde el fondo o el teclado, no al pulsar dentro del panel', async () => {
    render(<FriendsPanel {...defaultProps} />);

    await screen.findByText(/friends.social/i);

    const overlay = document.querySelector('.friends-sidebar-overlay') as HTMLElement;
    const content = document.querySelector('.friends-sidebar-content') as HTMLElement;

    fireEvent.click(content);
    expect(defaultProps.onClose).not.toHaveBeenCalled();

    fireEvent.click(overlay);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(overlay, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(2);
  });

  test('busca por codigo, permite ver perfil y anadir amigo', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    (gameService.searchUserByCode as any).mockResolvedValue({ username: 'target-user' });
    (gameService.followUser as any).mockResolvedValue({ ok: true });
    (gameService.getFriends as any).mockResolvedValue([]);

    render(<FriendsPanel {...defaultProps} />);

    const input = await screen.findByPlaceholderText('friends.code_placeholder');
    await user.type(input, '#ab12');
    expect(input).toHaveValue('AB12');

    await user.click(screen.getByText('friends.view_profile'));
    expect(defaultProps.onTriggerPublicProfile).toHaveBeenCalledWith('target-user');
    expect(gameService.searchUserByCode).toHaveBeenCalledWith('AB12');

    await user.click(screen.getByText('friends.add'));

    await waitFor(() => {
      expect(gameService.followUser).toHaveBeenCalledWith('target-user');
      expect(alertSpy).toHaveBeenCalledWith('friends.alert_now_following');
    });
    expect(input).toHaveValue('');
  });

  test('muestra alertas cuando la busqueda no encuentra usuario o falla', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    (gameService.searchUserByCode as any).mockResolvedValueOnce(null);

    render(<FriendsPanel {...defaultProps} />);

    const input = await screen.findByPlaceholderText('friends.code_placeholder');
    await user.type(input, 'missing');
    await user.click(screen.getByText('friends.add'));

    expect(alertSpy).toHaveBeenCalledWith('friends.alert_not_found');

    (gameService.searchUserByCode as any).mockRejectedValueOnce(new Error('search failed'));
    await user.click(screen.getByText('friends.view_profile'));

    expect(alertSpy).toHaveBeenCalledWith('friends.alert_search_error');
  });

  test('invita amigos, muestra carga y permite volver desde solicitudes', async () => {
    const user = userEvent.setup();
    (gameService.getFriends as any).mockResolvedValue([{ name: 'Bob', status: 'online' }]);
    (gameService.getPendingRequests as any).mockResolvedValue([]);

    render(<FriendsPanel {...defaultProps} inviteLoadingUser="Bob" />);

    expect(await screen.findByText('Bob')).toBeInTheDocument();
    const inviteButton = screen.getByRole('button', { name: 'common.loading' });
    expect(inviteButton).toBeDisabled();

    await user.click(screen.getByText(/friends.pending_requests/i));
    expect(screen.getByText('friends.no_pending')).toBeInTheDocument();

    await user.click(screen.getByText('friends.back_to_friends'));
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  test('permite rechazar una solicitud pendiente', async () => {
    const user = userEvent.setup();
    (gameService.getPendingRequests as any).mockResolvedValue([{ id: 'req_456', sender: 'Eve' }]);
    (gameService.respondToFriendRequest as any).mockResolvedValue({ ok: true });

    render(<FriendsPanel {...defaultProps} />);

    await user.click(await screen.findByText(/friends.pending_requests/i));
    const rejectButton = document.querySelector('.action-btn.reject') as HTMLButtonElement;
    await user.click(rejectButton);

    expect(gameService.respondToFriendRequest).toHaveBeenCalledWith('req_456', 'rejected');
  });
});
