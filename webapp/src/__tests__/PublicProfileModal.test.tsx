import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PublicProfileModal } from '../components/modals/PublicProfileModal';
import { gameService } from '../services/gameService';
import '@testing-library/jest-dom';

vi.mock('../services/gameService');
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('PublicProfileModal Coverage', () => {
  const defaultProps = {
    username: 'targetUser',
    onClose: vi.fn(),
  };

  const fullMockData = {
    username: 'targetUser',
    nickname: 'Target',
    relationship: 'none',
    iconName: 'avatar1',
    stats: { totalScore: 100, wins: 10, losses: 5 }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock de localStorage
    const localStorageMock = {
      getItem: vi.fn().mockReturnValue('myUser'),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true });
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    // IMPORTANTE: No limpiar el body manualmente aquí. 
    // cleanup() de testing-library ya se encarga de forma segura.
    cleanup();
  });

  it('debe cubrir el flujo de carga y éxito de la API', async () => {
    (gameService.getPublicProfile as any).mockResolvedValue(fullMockData);

    render(<PublicProfileModal {...defaultProps} />);

    expect(screen.getByText('common.loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Target')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });

  it('debe cubrir todos los estados del botón de acción', async () => {
    const relationships = [
      { type: 'self', expected: 'profile.is_you' },
      { type: 'pending', expected: 'profile.cancel_request' },
      { type: 'accepted', expected: 'profile.already_friends' },
      { type: 'default', expected: 'profile.add_friend' },
    ];

    for (const rel of relationships) {
      (gameService.getPublicProfile as any).mockResolvedValueOnce({ 
        ...fullMockData, 
        relationship: rel.type 
      });
      
      render(<PublicProfileModal {...defaultProps} />);
      
      await waitFor(() => expect(screen.getByText(rel.expected)).toBeInTheDocument());
      
      // Limpiamos de forma segura antes de la siguiente iteración
      cleanup();
    }
  });

  it('debe cubrir handleAddFriend y su error', async () => {
    const user = userEvent.setup();
    (gameService.getPublicProfile as any).mockResolvedValue(fullMockData);
    (gameService.followUser as any).mockRejectedValueOnce(new Error('Custom Error'));

    render(<PublicProfileModal {...defaultProps} />);
    
    const btn = await screen.findByText('profile.add_friend');
    await user.click(btn);

    expect(window.alert).toHaveBeenCalledWith('Custom Error');
  });

  it('debe cubrir el cierre por teclado y clic fuera', async () => {
    (gameService.getPublicProfile as any).mockResolvedValue(fullMockData);

    render(<PublicProfileModal {...defaultProps} />);
    await screen.findByText('Target');

    // Buscamos el backdrop en el body
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(defaultProps.onClose).toHaveBeenCalled();
      
      fireEvent.keyDown(backdrop, { key: 'Escape' });
      expect(defaultProps.onClose).toHaveBeenCalled();
    }
  });

  it('debe mostrar la inicial del nickname si no hay icono', async () => {
    (gameService.getPublicProfile as any).mockResolvedValue({ 
      ...fullMockData, 
      iconName: null,
      nickname: 'Zelda' 
    });
    
    render(<PublicProfileModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Z')).toBeInTheDocument();
    });
  });
});