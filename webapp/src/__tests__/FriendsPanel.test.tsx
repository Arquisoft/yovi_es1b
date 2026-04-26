import { act, render, screen, waitFor } from '@testing-library/react';
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
});