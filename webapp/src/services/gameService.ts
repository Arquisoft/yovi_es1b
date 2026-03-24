import { API_BASE_URL } from '../constants/config';
import type { GameYData, HistoryGameRecord } from '../types/game';

export const gameService = {
  // Obtener dificultades
  async getDifficulties(): Promise<string[]> {
    const res = await fetch(`${API_BASE_URL}/difficulties`);
    return res.json();
  },

  // Realizar un movimiento
  async makeMove(cellIndex: number, username: string, difficulty: string, boardSize?: number) {
    const res = await fetch(`${API_BASE_URL}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cellIndex, username, difficulty, boardSize }),
    });
    return res.json();
  },

  // Reiniciar tablero
  async resetBoard(size: number | null, difficulty: string, username: string): Promise<GameYData> {
    const res = await fetch(`${API_BASE_URL}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ size, difficulty, username }),
    });
    const data = await res.json();
    return data.responseFromRust ?? data;
  },

  // Rendirse
  async surrender(username: string, difficulty: string, boardSize?: number) {
    return fetch(`${API_BASE_URL}/surrender`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, difficulty, boardSize }),
    });
  },

  // Historial
  async getHistory(username: string, page: number, filter?: string | null) {
    let url = `${API_BASE_URL}/history?username=${username}&page=${page}&limit=5`;
    if (filter) url += `&result=${encodeURIComponent(filter)}`;
    const res = await fetch(url);
    return res.json();
  }
};