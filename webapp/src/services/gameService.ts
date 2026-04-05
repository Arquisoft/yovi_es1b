import { API_BASE_URL } from '../constants/config';
import type { GameYData } from '../types/game';
import { getAuthHeaders, getCurrentUser } from '../utils/sessionUtils';
export const gameService = {
  // Obtener dificultades
  async getDifficulties(): Promise<string[]> {
    const res = await fetch(`${API_BASE_URL}/difficulties`);
    return res.json();
  },

  // Realizar un movimiento
  async makeMove(cellIndex: number,  difficulty: string, boardSize?: number) {
    const res = await fetch(`${API_BASE_URL}/move`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ cellIndex, username: getCurrentUser(), difficulty, boardSize }),
    });
    return res.json();
  },

  // Reiniciar tablero
  async resetBoard(size: number | null, difficulty: string): Promise<GameYData> {
    const res = await fetch(`${API_BASE_URL}/reset`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ size, difficulty, username: getCurrentUser() }),
    });
    const data = await res.json();
    return data.responseFromRust ?? data;
  },

  // Rendirse
  async surrender( difficulty: string, boardSize?: number) {
    return fetch(`${API_BASE_URL}/surrender`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ username: getCurrentUser(), difficulty, boardSize }),
    });
  },

  // Historial
  async getHistory( page: number, filter?: string | null) {
    let url = `${API_BASE_URL}/history?username=${getCurrentUser()}&page=${page}&limit=5`;
    if (filter) url += `&result=${encodeURIComponent(filter)}`;
    const res = await fetch(url);
    return res.json();
  },

  async getFriends(): Promise<{ name: string, status: string }[]> {
    try {
      // Usamos encodeURIComponent por seguridad si el nombre tiene espacios o caracteres especiales
      const url = `${API_BASE_URL}/friends?username=${encodeURIComponent( getCurrentUser())}`;
      
      const res = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders()
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

  async addFriend( friendName: string) {
    const res = await fetch(`${API_BASE_URL}/friends/add`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ username: getCurrentUser(), friendName }),
    });
    return res.json();
  },

  async getProfile() {
    const res = await fetch(`${API_BASE_URL}/users/profile/${encodeURIComponent(getCurrentUser())}`);
    return res.json();
  },

  async updateProfile(

    payload: { birthDate?: string | null; language?: string; iconName?: string; nickname?: string }
  ) {
    const res = await fetch(`${API_BASE_URL}/users/profile/${encodeURIComponent(getCurrentUser())}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async changePassword( currentPassword: string, newPassword: string) {
    const res = await fetch(`${API_BASE_URL}/users/profile/${encodeURIComponent(getCurrentUser())}/change-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return res.json();
  },
  
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
  async followUser( targetUsername: string) {
    const res = await fetch(`${API_BASE_URL}/users/follow`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ 
        follower: getCurrentUser(),
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
      headers: getAuthHeaders(),
      body: JSON.stringify({ requestId, action }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al procesar la solicitud');
    }

    return res.json();
  },

  async getPendingRequests() {
    const res = await fetch(`${API_BASE_URL}/friends/requests?username=${encodeURIComponent(getCurrentUser())}`);
    if (!res.ok) throw new Error('No se pudieron obtener las solicitudes');
    return res.json();
  }
};
