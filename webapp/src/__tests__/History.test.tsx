import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App'; // Ajusta la ruta si tu App.tsx está en otra carpeta
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import '@testing-library/jest-dom';

// 1. Datos falsos para engañar a React
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
    // 2. Mock Router: Interceptamos TODAS las llamadas de red
    global.fetch = vi.fn(async (url: RequestInfo | URL) => {
      const urlString = url.toString();

      // Si React intenta hacer login, le decimos que todo ha ido bien
      if (urlString.includes('/login')) {
        return {
          ok: true,
          json: async () => ({ message: "Welcome", username: "Drus" })
        } as Response;
      }
      
      // Si React pide el historial, le devolvemos nuestra lista falsa
      if (urlString.includes('/history')) {
        return {
          ok: true,
          json: async () => mockHistoryResponse
        } as Response;
      }

      // Por defecto para cualquier otra cosa (ej. cargar dificultades al inicio)
      return { ok: true, json: async () => [] } as Response;
    });

    // Evitamos que los console.error ensucien la terminal del test
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 3. Función auxiliar: Hace el trabajo sucio de loguearse antes de cada test
  const loginAndOpenHistory = async (user: ReturnType<typeof userEvent.setup>) => {
    render(<App />);

    // 1. Clic en el botón "Iniciar sesion" de la pantalla Home
    await user.click(screen.getByRole('button', { name: /iniciar sesion/i }));

    // 2. Buscamos los inputs por sus etiquetas visibles
    const usernameInput = screen.getByLabelText(/nombre de usuario/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    
    await user.type(usernameInput, 'Drus');
    await user.type(passwordInput, '12345');

    // 3. Clic en el botón "Iniciar sesion" del formulario. 
    // Usamos getAllByRole porque a veces el botón de la pantalla Home tarda unos milisegundos en desaparecer del DOM virtual del test
    const botonesLogin = screen.getAllByRole('button', { name: /iniciar sesion/i });
    await user.click(botonesLogin[botonesLogin.length - 1]); // Clic al último renderizado

    // 4. Esperamos a que la petición fetch falsa responda, cargue el juego y aparezca el botón "Historial"
    const historyBtn = await screen.findByRole('button', { name: /historial/i });
    await user.click(historyBtn);
  };

  test('abre el modal y muestra la tabla con datos del servidor', async () => {
    const user = userEvent.setup();
    await loginAndOpenHistory(user);

    // Comprobamos que los datos mockeados se han pintado en pantalla
    expect(await screen.findByText('pro_bot')).toBeInTheDocument();
    expect(screen.getByText('edge_bot')).toBeInTheDocument();
    
    // Verificamos que se llamó a la API del historial
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/history?username=Drus'));
  });

  test('aplica el filtro de resultados modificando la URL', async () => {
    const user = userEvent.setup();
    await loginAndOpenHistory(user);

    // Buscamos el desplegable. Si le pusiste un id "result-filter", lo encontraremos fácil
    const selectFiltro = await screen.findByRole('combobox', { name: /filtrar por resultado/i });
    
    // Simulamos elegir "Derrotas" (Asegúrate de que el <option value="Derrota"> coincide con esto)
    await user.selectOptions(selectFiltro, 'Derrota');

    // Extraemos todas las llamadas que ha hecho la app a fetch
    const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    
    // Buscamos la última llamada que se hizo
    const lastCallUrl = fetchCalls[fetchCalls.length - 1][0];

    // CRÍTICO: Comprobamos si la URL lleva el parámetro correcto
    expect(lastCallUrl).toContain('result=Derrota');
    // Verificamos que reinicia a la página 1 al filtrar
    expect(lastCallUrl).toContain('page=1');
  });

});