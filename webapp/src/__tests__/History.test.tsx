import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

const mockHistoryResponse = {
  data: [
    { _id: { $oid: "1" }, date: "2026-03-18T10:00:00Z", opponent: "pro_bot", board_size: 6, difficulty: "Hard", result: "Derrota" },
    { _id: { $oid: "2" }, date: "2026-03-18T11:00:00Z", opponent: "edge_bot", board_size: 9, difficulty: "Easy", result: "Victoria" }
  ],
  page: 1,
  total_pages: 3
};

describe('Tests de Integración: Historial y Filtros', () => {
  beforeEach(() => {
    // 1. LIMPIEZA CRÍTICA: Borramos el localStorage antes de cada test
    // para que la app siempre empiece en la Home sin usuario.
    localStorage.clear();
    vi.clearAllMocks();

    global.fetch = vi.fn(async (url: RequestInfo | URL) => {
      const urlString = url.toString();

      // Mock para la carga inicial de dificultades en App.tsx
      if (urlString.includes('/difficulties')) {
        return { ok: true, json: async () => ['Easy', 'Medium', 'Hard'] } as Response;
      }

      if (urlString.includes('/login')) {
        return {
          ok: true,
          json: async () => ({ message: "Welcome", username: "Drus" })
        } as Response;
      }
      
      if (urlString.includes('/history')) {
        return {
          ok: true,
          json: async () => mockHistoryResponse
        } as Response;
      }

      // Respuesta para resetGame/start (tablero inicial)
      return { 
        ok: true, 
        json: async () => ({ 
          responseFromRust: { size: 6, layout: ".".repeat(36) },
          winner: null 
        }) 
      } as Response;
    });

    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const loginAndOpenHistory = async (user: ReturnType<typeof userEvent.setup>) => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    // Navegar a Login
    const loginEntryBtn = await screen.findByRole('button', { name: /iniciar sesion/i });
    await user.click(loginEntryBtn);

    // Rellenar formulario
    const usernameInput = await screen.findByLabelText(/usuario/i);
    const passwordInput = screen.getByLabelText(/contra/i);
    
    await user.type(usernameInput, 'Drus');
    await user.type(passwordInput, '12345');

    // Clic en el botón de enviar del formulario
    const loginSubmitBtn = screen.getByRole('button', { name: /^iniciar sesion$/i });
    await user.click(loginSubmitBtn);

    // Esperar a llegar al juego y que aparezca el botón Historial
    const historyBtn = await screen.findByRole('button', { name: /historial/i }, { timeout: 2000 });
    await user.click(historyBtn);
  };

  test('abre el modal y muestra la tabla con datos del servidor', async () => {
    const user = userEvent.setup();
    await loginAndOpenHistory(user);

    // Verificamos que los datos mockeados aparecen (usamos findBy para esperar el render)
    expect(await screen.findByText('pro_bot')).toBeInTheDocument();
    expect(screen.getByText('edge_bot')).toBeInTheDocument();
    
    // Verificamos la llamada a la API
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('username=Drus'));
    });
  });

  test('aplica el filtro de resultados modificando la URL', async () => {
    const user = userEvent.setup();
    await loginAndOpenHistory(user);

    const selectFiltro = await screen.findByRole('combobox', { name: /filtrar por resultado/i });
    await user.selectOptions(selectFiltro, 'Derrota');

    await waitFor(() => {
      const fetchCalls = (global.fetch as any).mock.calls;
      const historyCall = fetchCalls.find((call: any) => call[0].includes('/history') && call[0].includes('result=Derrota'));
      expect(historyCall).toBeDefined();
    });
  });
});