import { API_BASE_URL } from '../constants/config';
import type { GameYData, HistoryGameRecord } from '../types/game';
import { getAuthHeaders, getCurrentUser } from '../utils/sessionUtils';
import { getHistoryFilterKey } from '../utils/gameLabelUtils';

type GameHistoryContext = Readonly<{
  boardLabel?: string | null;
  locale?: string | null;
  resultLabel?: string | null;
}>;

export type MoveResponse = {
  responseFromRust?: GameYData;
  winner: number | null;
  score?: number;
};

type HistoryResponse = {
  data?: HistoryGameRecord[];
  page?: number;
  total_pages?: number;
};

type UserProfileResponse = {
  birthDate?: string | null;
  error?: string;
  icon?: string | null;
  iconName?: string | null;
  language?: string | null;
  nickname?: string | null;
  stats?: {
    totalScore?: number;
  };
  totalScore?: number;
  username?: string;
};

const createAuthenticatedInit = (init: RequestInit = {}): RequestInit => ({
  ...init,
  headers: {
    ...getAuthHeaders(),
    ...(init.headers ?? {}),
  },
});

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const res = init ? await fetch(url, init) : await fetch(url);
  return res.json() as Promise<T>;
};

export const gameService = {
  // Obtener dificultades
  async getDifficulties(): Promise<string[]> {
    return fetchJson(`${API_BASE_URL}/difficulties`);
  },

  // Realizar un movimiento
  async makeMove(cellIndex: number,  difficulty: string, boardSize?: number, context?: GameHistoryContext): Promise<MoveResponse> {
    return fetchJson<MoveResponse>(`${API_BASE_URL}/move`, createAuthenticatedInit({
      method: 'POST',
      body: JSON.stringify({ 
        cellIndex, 
        username: getCurrentUser(), 
        difficulty, 
        boardSize,
        ...context,
      }),
    }));
  },

  // Reiniciar tablero
  async resetBoard(size: number | null, difficulty: string): Promise<GameYData> {
    const data = await fetchJson<GameYData & { responseFromRust?: GameYData }>(`${API_BASE_URL}/reset`, createAuthenticatedInit({
      method: 'POST',
      body: JSON.stringify({ size, difficulty, username: getCurrentUser() }),
    }));
    return data.responseFromRust ?? data;
  },

  // Rendirse
  async surrender( difficulty: string, boardSize?: number, context?: GameHistoryContext) {
    return fetch(`${API_BASE_URL}/surrender`, createAuthenticatedInit({
      method: 'POST',
      body: JSON.stringify({ username: getCurrentUser(), difficulty, boardSize, ...context }),
    }));
  },

  // Historial
  async getHistory( page: number, filter?: string | null): Promise<HistoryResponse> {
    let url = `${API_BASE_URL}/history?username=${getCurrentUser()}&page=${page}&limit=5`;
    const normalizedFilter = getHistoryFilterKey(filter);
    if (normalizedFilter) url += `&result=${encodeURIComponent(normalizedFilter)}`;
    return fetchJson<HistoryResponse>(url);
  },

  async getFriends(): Promise<{ name: string, status: string }[]> {
    try {
      // Usamos encodeURIComponent por seguridad si el nombre tiene espacios o caracteres especiales
      const url = `${API_BASE_URL}/friends?username=${encodeURIComponent( getCurrentUser())}`;
      
      const res = await fetch(url, createAuthenticatedInit({ method: 'GET' }));

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
    return fetchJson(`${API_BASE_URL}/friends/add`, createAuthenticatedInit({
      method: 'POST',
      body: JSON.stringify({ username: getCurrentUser(), friendName }),
    }));
  },

  async getProfile(username?: string): Promise<UserProfileResponse> {
    // Si pasan un username (ej. un amigo), usamos ese.
    // Si NO pasan nada, usamos el de la sesión activa.
    const targetUser = username || getCurrentUser();

    return fetchJson<UserProfileResponse>(`${API_BASE_URL}/users/profile/${targetUser}`, createAuthenticatedInit({ method: 'GET' }));
  },

  async updateProfile(

    payload: { birthDate?: string | null; language?: string; iconName?: string; nickname?: string }
  ): Promise<UserProfileResponse> {
    return fetchJson<UserProfileResponse>(`${API_BASE_URL}/users/profile/${encodeURIComponent(getCurrentUser())}`, createAuthenticatedInit({
      method: 'PATCH',
      body: JSON.stringify(payload),
    }));
  },

  async changePassword( currentPassword: string, newPassword: string): Promise<UserProfileResponse> {
    return fetchJson<UserProfileResponse>(`${API_BASE_URL}/users/profile/${encodeURIComponent(getCurrentUser())}/change-password`, createAuthenticatedInit({
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }));
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
    const res = await fetch(`${API_BASE_URL}/users/follow`, createAuthenticatedInit({
      method: 'POST',
      body: JSON.stringify({ 
        follower: getCurrentUser(),
        following: targetUsername 
      }),
    }));

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'No se pudo añadir al amigo');
    }

    return res.json();
  },

  async respondToFriendRequest(requestId: string, action: 'accepted' | 'rejected') {
    const res = await fetch(`${API_BASE_URL}/friends/respond`, createAuthenticatedInit({
      method: 'POST',
      body: JSON.stringify({ requestId, action }),
    }));

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al procesar la solicitud');
    }

    return res.json();
  },

  async getPendingRequests() {
    const res = await fetch(`${API_BASE_URL}/friends/requests?username=${encodeURIComponent(getCurrentUser())}`, createAuthenticatedInit({ method: 'GET' }));
    if (!res.ok) throw new Error('No se pudieron obtener las solicitudes');
    return res.json();
  },

  /**
   * Obtiene el perfil público de un usuario, incluyendo estadísticas de juego.
   * @param targetUsername 
   * @returns el perfil público del usuario con estadísticas de juego
   */
  async getPublicProfile(targetUsername: string, myUsername: string) {
    const response = await fetch(`${API_BASE_URL}/users/public-profile/${targetUsername}?requester=${myUsername}`, createAuthenticatedInit({ method: 'GET' }));
    if (!response.ok) throw new Error('No se pudo obtener el perfil público');
    return await response.json();
  },

  /**
   * Cancela una solicitud de amistad pendiente.
   * @param follower 
   * @param following 
   * @returns 
   */
  async cancelFriendRequest(follower: string, following: string) {
    const response = await fetch(`${API_BASE_URL}/friends/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ follower, following })
    });
    return await response.json();
  },

  async addXP(amount: number) {
    return fetchJson(`${API_BASE_URL}/users/purchase-xp`, createAuthenticatedInit({
      method: 'POST',
      body: JSON.stringify({ 
        username: getCurrentUser(), 
        amount 
      }),
    }));
  }
};
