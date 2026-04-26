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

export type UserProfileResponse = {
  birthDate?: string | null;
  error?: string;
  friendCode?: string;
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

export type Friend = {
  name: string;
  status: string;
};

export type FriendRequest = {
  id: string;
  sender: string;
};

export type PublicProfileResponse = {
  username: string;
  nickname: string;
  iconName: string | null;
  friendCode: string;
  stats: {
    wins: number;
    losses: number;
    totalGames: number;
    totalScore?: number;
  };
  relationship: 'none' | 'pending' | 'accepted' | 'self';
};

const USERNAME_PATTERN = /^[\p{L}\p{N}\s._-]{1,64}$/u;

/**
 * Normaliza y construye URLs para la API
 */
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

/**
 * Valida y obtiene el usuario actual.
 */
const getRequiredUsername = (username?: string | null) => {
    const resolvedUsername = typeof username === 'string' ? username : getCurrentUser();
    const trimmedUsername = resolvedUsername.trim();
    if (!trimmedUsername || !USERNAME_PATTERN.test(trimmedUsername)) {
        throw new Error('Missing or invalid username');
    }
    return trimmedUsername;
};

/**
 * Mezcla las cabeceras de autenticación (JWT/Sesión) con las del request.
 */
const createAuthenticatedInit = (init?: RequestInit): RequestInit => {
    const authHeaders: Record<string, string> = getAuthHeaders();

    // Filtramos para evitar la duplicación de Content-Type si authHeaders ya la provee,
    // o si vamos a definirla por defecto.
    const headers: Record<string, string> = {};
    if (!authHeaders['Content-Type'] && !authHeaders['content-type']) {
        headers['Content-Type'] = 'application/json';
    }
    Object.assign(headers, authHeaders);

    if (init?.headers) {
        const incoming = new Headers(init.headers);
        incoming.forEach((v, k) => {
            if (k.toLowerCase() === 'content-type') {
                headers['Content-Type'] = v;
                delete headers['content-type']; // Eliminar duplicados en minúscula si existen
            } else {
                headers[k] = v;
            }
        });
    }

    return {
        credentials: 'include', // Importante para cookies/cors
        ...init,
        headers
    };
};

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  // Fusionamos las opciones que vengan con el permiso para enviar cookies
  const requestOptions: RequestInit = {
    ...init,
    credentials: 'include', // <--- ESTO ES LO QUE ARREGLA EL 401
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  };

  console.log("🚀 Llamando a:", url);
  const res = await fetch(url, requestOptions);

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'No hay detalle del error');


    console.error(`Error en fetch a ${url}: ${res.status} - ${errorText.replaceAll(/[\n\r]/g, '_')}`);

    throw new Error(`Error en la petición: ${res.status}`);
  }

  const contentType = res.headers.get('content-type');

  if (!contentType?.includes('application/json')) {
    throw new Error('La respuesta no es un JSON válido');
  }

  return res.json() as Promise<T>;
};

// --- Servicio ---

export const gameService = {

    // 1. Autenticación y Registro
    async register(payload: {
        username: string;
        nickname: string;
        password: string;
        birthDate: string;
        language: string;
        iconName: string;
    }) {
        return fetchJson(buildApiUrl('/createuser'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    },

    async logout() {
        return fetchJson(buildApiUrl('/logout'), createAuthenticatedInit({ method: 'POST' }));
    },

    // 2. Lógica de Juego
    async getDifficulties(): Promise<string[]> {
        return fetchJson(buildApiUrl('/difficulties'));
    },

    async makeMove(cellIndex: number, difficulty: string, boardSize?: number, context?: GameHistoryContext): Promise<MoveResponse> {
        const username = getRequiredUsername();
        return fetchJson<MoveResponse>(buildApiUrl('/move'), createAuthenticatedInit({
            method: 'POST',
            body: JSON.stringify({ cellIndex, username, difficulty, boardSize, ...context }),
        }));
    },

    async resetBoard(size: number | null, difficulty: string): Promise<GameYData> {
        const username = getRequiredUsername();
        const data = await fetchJson<GameYData & { responseFromRust?: GameYData }>(buildApiUrl('/reset'), createAuthenticatedInit({
            method: 'POST',
            body: JSON.stringify({ size, difficulty, username }),
        }));
        return data.responseFromRust ?? data;
    },

    async surrender(difficulty: string, boardSize?: number, context?: GameHistoryContext) {
        const username = getRequiredUsername();
        return fetch(buildApiUrl('/surrender'), createAuthenticatedInit({
            method: 'POST',
            body: JSON.stringify({ username, difficulty, boardSize, ...context }),
        }));
    },

    async getHistory(page: number, filter?: string | null): Promise<HistoryResponse> {
        const username = getRequiredUsername();
        const normalizedFilter = getHistoryFilterKey(filter);
        const url = buildApiUrl('/history', {
            username,
            page,
            limit: 5,
            result: normalizedFilter || undefined
        });
        return fetchJson<HistoryResponse>(url, createAuthenticatedInit({ method: 'GET' }));
    },

    // 3. Social y Amigos
    async getFriends(): Promise<Friend[]> {
        try {
            const url = buildApiUrl('/friends', { username: getRequiredUsername() });
            return await fetchJson<Friend[]>(url, createAuthenticatedInit({ method: 'GET' }));
        } catch (error) {
            console.error("Error al obtener amigos:", error);
            return [];
        }
    },

    async addFriend(friendName: string) {
        const username = getRequiredUsername();
        return fetchJson(buildApiUrl('/friends/add'), createAuthenticatedInit({
            method: 'POST',
            body: JSON.stringify({ username, friendName }),
        }));
    },

    async searchUserByCode(code: string) {
        const safeCode = String(code || '').trim();
        const url = buildApiUrl('/users/search', { query: `#${safeCode}` });
        const users = await fetchJson<any[]>(url, createAuthenticatedInit({ method: 'GET' }));
        return users.length > 0 ? users[0] : null;
    },

    async followUser(targetUsername: string) {
        const username = getRequiredUsername();
        return fetchJson(buildApiUrl('/users/follow'), createAuthenticatedInit({
            method: 'POST',
            body: JSON.stringify({
                follower: username,
                following: String(targetUsername || '').trim(),
            }),
        }));
    },

    async respondToFriendRequest(requestId: string, action: 'accepted' | 'rejected') {
        return fetchJson(buildApiUrl('/friends/respond'), createAuthenticatedInit({
            method: 'POST',
            body: JSON.stringify({ requestId, action }),
        }));
    },

    async getPendingRequests(): Promise<FriendRequest[]> {
        return fetchJson<FriendRequest[]>(buildApiUrl('/friends/requests', { username: getRequiredUsername() }), createAuthenticatedInit({ method: 'GET' }));
    },
    /**
     * Cancela una solicitud de amistad pendiente.
     * @param follower
     * @param following
     * @returns
     */
    async cancelFriendRequest(follower: string, following: string) {
        return fetchJson(buildApiUrl('/friends/cancel'), createAuthenticatedInit({
            method: 'POST',
            body: JSON.stringify({
                follower: String(follower || '').trim(),
                following: String(following || '').trim(),
            }),
        }));
    },

    // 4. Perfil y Extras
    async getProfile(username?: string): Promise<UserProfileResponse> {
        const targetUser = getRequiredUsername(username);
        return fetchJson<UserProfileResponse>(buildApiUrl(`/users/profile/${encodeURIComponent(targetUser)}`), createAuthenticatedInit({ method: 'GET' }));
    },
    /**
     * Obtiene el perfil público de un usuario, incluyendo estadísticas de juego.
     * @param targetUsername
     * @returns el perfil público del usuario con estadísticas de juego
     */
    async getPublicProfile(targetUsername: string, myUsername: string): Promise<PublicProfileResponse> {
        const safeTarget = encodeURIComponent(String(targetUsername || '').trim());
        const safeRequester = encodeURIComponent(String(myUsername || '').trim());
        return fetchJson<PublicProfileResponse>(buildApiUrl(`/users/public-profile/${safeTarget}`, { requester: safeRequester }), createAuthenticatedInit({ method: 'GET' }));
    },

    async updateProfile(payload: { birthDate?: string | null; language?: string; iconName?: string; nickname?: string }): Promise<UserProfileResponse> {
        return fetchJson<UserProfileResponse>(buildApiUrl(`/users/profile/${encodeURIComponent(getRequiredUsername())}`), createAuthenticatedInit({
            method: 'PATCH',
            body: JSON.stringify(payload),
        }));
    },

    async changePassword(currentPassword: string, newPassword: string): Promise<UserProfileResponse> {
        return fetchJson<UserProfileResponse>(buildApiUrl(`/users/profile/${encodeURIComponent(getRequiredUsername())}/change-password`), createAuthenticatedInit({
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword }),
        }));
    },

    async addXP(amount: number) {
        const username = getRequiredUsername();
        return fetchJson(buildApiUrl('/users/purchase-xp'), createAuthenticatedInit({
            method: 'POST',
            body: JSON.stringify({ username, amount }),
        }));
    }
};
