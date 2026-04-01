import { API_BASE_URL } from '../constants/config';
import type { GameYData } from '../types/game';

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
  },

  async getFriends(username: string): Promise<{ name: string, status: string }[]> {
    try {
      // Usamos encodeURIComponent por seguridad si el nombre tiene espacios o caracteres especiales
      const url = `${API_BASE_URL}/friends?username=${encodeURIComponent(username)}`;
      
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error en la respuesta de amigos:", errorText);
        return []; // Devolvemos array vacío para que la UI no rompa
      }

      return await res.json();
    } catch (error) {
      console.error("Error de red al obtener amigos:", error);
      return [];
    }
  },

  async addFriend(username: string, friendName: string) {
    const res = await fetch(`${API_BASE_URL}/friends/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, friendName }),
    });
    return res.json();
  },

  async getProfile(username: string) {
    const res = await fetch(`${API_BASE_URL}/users/profile/${encodeURIComponent(username)}`);
    return res.json();
  },

  async updateProfile(
    username: string,
    payload: { birthDate?: string | null; language?: string; iconName?: string; nickname?: string }
  ) {
    const res = await fetch(`${API_BASE_URL}/users/profile/${encodeURIComponent(username)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async changePassword(username: string, currentPassword: string, newPassword: string) {
    const res = await fetch(`${API_BASE_URL}/users/profile/${encodeURIComponent(username)}/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return res.json();
  },
};
  // 1. Buscar usuario específicamente por su Friend Code (#ABC123)
  async searchUserByCode(code: string) {
    // Le añadimos el # nosotros para que el buscador del back sepa que es un ID
    const url = `${API_BASE_URL}/users/search?query=${encodeURIComponent('#' + code)}`;
    const res = await fetch(url);
    
    if (!res.ok) throw new Error('Error en la búsqueda');
    
    const users = await res.json();
    // Devolvemos el primer usuario que coincida o null
    return users.length > 0 ? users[0] : null;
  },

  // 2. Seguir/Añadir amigo (Ajustado a tu endpoint /users/follow)
  async followUser(myUsername: string, targetUsername: string) {
    const res = await fetch(`${API_BASE_URL}/users/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        follower: myUsername, 
        following: targetUsername 
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'No se pudo añadir al amigo');
    }

    return res.json();
  },

  async respondToFriendRequest(requestId: string, action: 'accepted' | 'rejected') {
    const res = await fetch(`${API_BASE_URL}/friends/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, action }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al procesar la solicitud');
    }

    return res.json();
  },

  async getPendingRequests(username: string) {
    const res = await fetch(`${API_BASE_URL}/friends/requests?username=${encodeURIComponent(username)}`);
    if (!res.ok) throw new Error('No se pudieron obtener las solicitudes');
    return res.json();
  }
};
