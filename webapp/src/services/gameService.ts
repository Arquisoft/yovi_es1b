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

const createAuthenticatedInit = (init?: RequestInit): RequestInit => {
  const headers = mergeHeaders(init);
  if (!init) return { headers };
  return { ...init, headers };
};

const USERNAME_PATTERN = /^[\p{L}\p{N} _.-]{1,64}$/u;

const buildApiUrl = (path: string, params?: Record<string, string | number | null | undefined>) => {
  const url = new URL(path, API_BASE_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
};

const getRequiredUsername = (username?: string | null) => {
  const resolvedUsername = typeof username === 'string' ? username : getCurrentUser();
  const trimmedUsername = resolvedUsername.trim();
  if (!trimmedUsername || !USERNAME_PATTERN.test(trimmedUsername)) {
    throw new Error('Missing username');
  }

  return trimmedUsername;
};

const getSafeUsernamePathSegment = (username?: string | null) => encodeURIComponent(getRequiredUsername(username));

const mergeHeaders = (init?: RequestInit): HeadersInit => {
  const headers: Record<string, string> = { ...getAuthHeaders() };
  const incomingHeaders = init?.headers;

  if (incomingHeaders instanceof Headers) {
    incomingHeaders.forEach((value, key) => {
      headers[key] = value;
    });
  } else if (Array.isArray(incomingHeaders)) {
    for (const [key, value] of incomingHeaders) {
      headers[key] = value;
    }
  } else if (incomingHeaders) {
    Object.assign(headers, incomingHeaders);
  }

  return headers;
};

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const res = init ? await fetch(url, init) : await fetch(url);

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'No hay detalle del error');
    // Mantenemos la limpieza de logs que aplicamos antes para evitar inyecciones
    console.error(`Error en fetch a ${url}: ${res.status} - ${errorText.replace(/[\n\r]/g, '_')}`);
    throw new Error(`Error en la petición: ${res.status}`);
  }

  const contentType = res.headers.get('content-type');

  // CAMBIO CRÍTICO: Usamos el optional chaining aquí
  if (!contentType?.includes('application/json')) {
    throw new Error('La respuesta no es un JSON válido');
  }

  return res.json() as Promise<T>; 
};
export const gameService = {
  // Obtener dificultades
  async getDifficulties(): Promise<string[]> {
    return fetchJson(buildApiUrl('/difficulties'));
  },

  // Realizar un movimiento
  async makeMove(cellIndex: number,  difficulty: string, boardSize?: number, context?: GameHistoryContext): Promise<MoveResponse> {
    const username = getRequiredUsername();
    return fetchJson<MoveResponse>(buildApiUrl('/move'), createAuthenticatedInit({
      method: 'POST',
      body: JSON.stringify({ 
        cellIndex, 
        username, 
        difficulty, 
        boardSize,
        ...context,
      }),
    }));
  },

  // Reiniciar tablero
  async resetBoard(size: number | null, difficulty: string): Promise<GameYData> {
    const username = getRequiredUsername();
    const data = await fetchJson<GameYData & { responseFromRust?: GameYData }>(buildApiUrl('/reset'), createAuthenticatedInit({
      method: 'POST',
      body: JSON.stringify({ size, difficulty, username }),
    }));
    return data.responseFromRust ?? data;
  },

  // Rendirse
  async surrender( difficulty: string, boardSize?: number, context?: GameHistoryContext) {
    const username = getRequiredUsername();
    return fetch(buildApiUrl('/surrender'), createAuthenticatedInit({
      method: 'POST',
      body: JSON.stringify({ username, difficulty, boardSize, ...context }),
    }));
  },

  // Historial
  async getHistory( page: number, filter?: string | null): Promise<HistoryResponse> {
    const username = getRequiredUsername();
    let url = buildApiUrl('/history', { username, page, limit: 5 });
    const normalizedFilter = getHistoryFilterKey(filter);
    if (normalizedFilter) url = buildApiUrl('/history', { username, page, limit: 5, result: normalizedFilter });
    return fetchJson<HistoryResponse>(url);
  },

  async getFriends(): Promise<{ name: string, status: string }[]> {
    try {
      // Usamos encodeURIComponent por seguridad si el nombre tiene espacios o caracteres especiales
      const url = buildApiUrl('/friends', { username: getRequiredUsername() });
      
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
    const username = getRequiredUsername();
    return fetchJson(buildApiUrl('/friends/add'), createAuthenticatedInit({
      method: 'POST',
      body: JSON.stringify({ username, friendName }),
    }));
  },

  async getProfile(username?: string): Promise<UserProfileResponse> {
    // Si pasan un username (ej. un amigo), usamos ese.
    // Si NO pasan nada, usamos el de la sesión activa.
    const targetUser = getRequiredUsername(username);

    return fetchJson<UserProfileResponse>(buildApiUrl(`/users/profile/${encodeURIComponent(targetUser)}`), createAuthenticatedInit({ method: 'GET' }));
  },

  async updateProfile(

    payload: { birthDate?: string | null; language?: string; iconName?: string; nickname?: string }
  ): Promise<UserProfileResponse> {
    return fetchJson<UserProfileResponse>(buildApiUrl(`/users/profile/${getSafeUsernamePathSegment()}`), createAuthenticatedInit({
      method: 'PATCH',
      body: JSON.stringify(payload),
    }));
  },

  async changePassword( currentPassword: string, newPassword: string): Promise<UserProfileResponse> {
    return fetchJson<UserProfileResponse>(buildApiUrl(`/users/profile/${getSafeUsernamePathSegment()}/change-password`), createAuthenticatedInit({
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }));
  },
  
  // 1. Buscar usuario específicamente por su Friend Code (#ABC123)
  async searchUserByCode(code: string) {
    // Le añadimos el # nosotros para que el buscador del back sepa que es un ID
    const safeCode = String(code || '').trim();
    const url = buildApiUrl('/users/search', { query: `#${safeCode}` });
    const res = await fetch(url);
    
    if (!res.ok) throw new Error('Error en la búsqueda');
    
    const users = await res.json();
    // Devolvemos el primer usuario que coincida o null
    return users.length > 0 ? users[0] : null;
  },

  // 2. Seguir/Añadir amigo (Ajustado a tu endpoint /users/follow)
  async followUser( targetUsername: string) {
    const username = getRequiredUsername();
    const safeTargetUsername = String(targetUsername || '').trim();
    const res = await fetch(buildApiUrl('/users/follow'), createAuthenticatedInit({
      method: 'POST',
      body: JSON.stringify({ 
        follower: username,
        following: safeTargetUsername 
      }),
    }));

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'No se pudo añadir al amigo');
    }

    return res.json();
  },

  async respondToFriendRequest(requestId: string, action: 'accepted' | 'rejected') {
    const res = await fetch(buildApiUrl('/friends/respond'), createAuthenticatedInit({
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
    const res = await fetch(buildApiUrl('/friends/requests', { username: getRequiredUsername() }), createAuthenticatedInit({ method: 'GET' }));
    if (!res.ok) throw new Error('No se pudieron obtener las solicitudes');
    return res.json();
  },

  /**
   * Obtiene el perfil público de un usuario, incluyendo estadísticas de juego.
   * @param targetUsername 
   * @returns el perfil público del usuario con estadísticas de juego
   */
  async getPublicProfile(targetUsername: string, myUsername: string) {
    const safeTarget = encodeURIComponent(String(targetUsername || '').trim());
    const safeRequester = encodeURIComponent(String(myUsername || '').trim());
    const response = await fetch(buildApiUrl(`/users/public-profile/${safeTarget}`, { requester: safeRequester }), createAuthenticatedInit({ method: 'GET' }));
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
    const safeFollower = String(follower || '').trim();
    const safeFollowing = String(following || '').trim();
    const response = await fetch(buildApiUrl('/friends/cancel'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ follower: safeFollower, following: safeFollowing })
    });
    return await response.json();
  },

  async addXP(amount: number) {
    const username = getRequiredUsername();
    return fetchJson(buildApiUrl('/users/purchase-xp'), createAuthenticatedInit({
      method: 'POST',
      body: JSON.stringify({ 
        username, 
        amount 
      }),
    }));
  }
};
