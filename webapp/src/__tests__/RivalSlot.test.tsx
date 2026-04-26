import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import RivalSlot from '../components/RivalSlot';
import '../i18n';
import '@testing-library/jest-dom';

describe('RivalSlot', () => {
  test('shows bot data in bot mode', () => {
    render(<RivalSlot gameMode="bot" botName="Bot Player" botIcon="/bot.png" />);

    expect(screen.getByText('Bot Player')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/bot.png');
  });

  test('shows invite button in empty multiplayer mode', async () => {
    const user = userEvent.setup();
    const onInviteFriends = vi.fn();

    render(<RivalSlot gameMode="multiplayer" onInviteFriends={onInviteFriends} />);
    await user.click(screen.getByRole('button'));

    expect(onInviteFriends).toHaveBeenCalledOnce();
  });

  test('shows rival data in multiplayer mode', () => {
    render(<RivalSlot gameMode="multiplayer" rivalName="Rival" rivalIcon="/rival.png" />);

    expect(screen.getByText('Rival')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/rival.png');
  });
});
