import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { GameModeScreen } from '../screens/GameModeScreen';
import '../i18n';
import '@testing-library/jest-dom';

describe('GameModeScreen', () => {
  test('renders a native dialog and selects modes', async () => {
    const user = userEvent.setup();
    const onSelectMode = vi.fn();
    const onLogout = vi.fn();

    render(<GameModeScreen onSelectMode={onSelectMode} onLogout={onLogout} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /ia|ai/i }));
    await user.click(screen.getByRole('button', { name: /multijugador|multiplayer/i }));
    await user.click(screen.getByRole('button', { name: /cerrar|logout/i }));

    expect(onSelectMode).toHaveBeenCalledWith('bot');
    expect(onSelectMode).toHaveBeenCalledWith('multiplayer');
    expect(onLogout).toHaveBeenCalledOnce();
  });
});
