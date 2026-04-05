import { render, screen, fireEvent } from '@testing-library/react';
import { PublicProfileModal } from '../components/modals/PublicProfileModal';
import { gameService } from '../services/gameService';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock del servicio
vi.mock('../services/gameService');

describe('PublicProfileModal', () => {
  const mockData = {
    username: 'testuser',
    nickname: 'Test Nick',
    friendCode: '12345678',
    iconName: 'robot.png',
    stats: { wins: 5, losses: 2, totalGames: 7 },
    relationship: 'none'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (gameService.getPublicProfile as any).mockResolvedValue(mockData);
  });

  it('renderiza la información del perfil correctamente', async () => {
    render(<PublicProfileModal username="testuser" onClose={vi.fn()} />);

    expect(await screen.findByText('Test Nick')).toBeInTheDocument();
    expect(screen.getByText('#12345678')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // Wins
  });

  it('muestra el botón "AÑADIR AMIGO" cuando no hay relación', async () => {
    render(<PublicProfileModal username="testuser" onClose={vi.fn()} />);
    const btn = await screen.findByText(/AÑADIR AMIGO/i);
    expect(btn).toBeInTheDocument();
  });

  it('permite cancelar una solicitud pendiente', async () => {
    // Simulamos que el perfil ya viene con solicitud pendiente
    (gameService.getPublicProfile as any).mockResolvedValue({
      ...mockData,
      relationship: 'pending'
    });

    render(<PublicProfileModal username="testuser" onClose={vi.fn()} />);
    
    const cancelBtn = await screen.findByText(/CANCELAR SOLICITUD/i);
    fireEvent.click(cancelBtn);

    expect(gameService.cancelFriendRequest).toHaveBeenCalled();
  });
});