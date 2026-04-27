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
    const onOpenLanguage = vi.fn();
    const onOpenProfile = vi.fn();
    const onOpenSettings = vi.fn();
    const onOpenTutorial = vi.fn();

    render(
      <GameModeScreen
        onSelectMode={onSelectMode}
        onLogout={onLogout}
        onOpenLanguage={onOpenLanguage}
        onOpenProfile={onOpenProfile}
        onOpenSettings={onOpenSettings}
        onOpenTutorial={onOpenTutorial}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByAltText('GameY')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /idioma|language/i }));
    await user.click(screen.getByRole('button', { name: /perfil|profile/i }));
    await user.click(screen.getByRole('button', { name: /configuraci|settings/i }));
    await user.click(screen.getByRole('button', { name: /ayuda|help/i }));
    await user.click(screen.getByRole('button', { name: /ia|ai/i }));
    await user.click(screen.getByRole('button', { name: /multijugador|multiplayer/i }));
    await user.click(screen.getByRole('button', { name: /cerrar|logout/i }));

    expect(onOpenLanguage).toHaveBeenCalledOnce();
    expect(onOpenProfile).toHaveBeenCalledOnce();
    expect(onOpenSettings).toHaveBeenCalledOnce();
    expect(onOpenTutorial).toHaveBeenCalledOnce();
    expect(onSelectMode).toHaveBeenCalledWith('bot');
    expect(onSelectMode).toHaveBeenCalledWith('multiplayer');
    expect(onLogout).toHaveBeenCalledOnce();
  });
});
