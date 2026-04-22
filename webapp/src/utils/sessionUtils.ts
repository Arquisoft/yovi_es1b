/**
 * Recupera las cabeceras de autenticación necesarias para las llamadas a la API.
 */
export const getAuthHeaders = () => {
    const token = sessionStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

/**
 * Recupera el nombre de usuario de la sesión actual.
 * Se usa para que Rust identifique qué partida cargar.
 */
export const getCurrentUser = (): string => {
    return sessionStorage.getItem('username') || '';
};

/**
 * Marca la sesión actual como invitado temporal.
 */
export const enableGuestSession = () => {
    sessionStorage.setItem('yovi_guest', '1');
};

/**
 * Comprueba si la sesión actual es de invitado.
 */
export const isGuestSession = (): boolean => {
    return sessionStorage.getItem('yovi_guest') === '1';
};

/**
 * Elimina la marca de invitado.
 */
export const clearGuestSession = () => {
    sessionStorage.removeItem('yovi_guest');
};

/**
 * Limpia la sesión (útil para el Logout).
 */
export const clearSession = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('username');
    clearGuestSession();
};

/**
 * Sustituye la sesión activa por la del usuario recién registrado.
 * Se usa tras crear una cuenta para evitar arrastrar el usuario anterior.
 */
export const activateRegisteredSession = (username: string) => {
    const name = username.trim();
    if (!name) return false;

    clearSession();
    sessionStorage.setItem('username', name);
    return true;
};

type PersistUserSessionOptions = {
  friendCode: string;
  icon?: string | null;
  language?: string | null;
  nickname?: string | null;
};

const setOrClear = (key: string, value?: string | null) => {
  if (typeof value === 'string' && value.trim()) {
    localStorage.setItem(key, value.trim());
  } else {
    localStorage.removeItem(key);
  }
};

export const persistUserSession = (username: string, options: PersistUserSessionOptions) => {
  const name = username.trim();
  if (!name) return false;

  localStorage.setItem('yovi_user', name);
  localStorage.setItem('yovi_friend_code', options.friendCode);
  setOrClear('yovi_user_icon', options.icon);
  setOrClear('yovi_user_language', options.language);
  setOrClear('yovi_user_nickname', options.nickname);
  return true;
};
