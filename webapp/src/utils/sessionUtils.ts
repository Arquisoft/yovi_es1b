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

const sanitizeBrowserStorageValue = (value?: string | null, maxLength = 128) => {
  const normalized = String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[^\p{L}\p{N}\s._-]/gu, '')
    .trim();

  return normalized.slice(0, maxLength);
};

const STORAGE_VALUE_PATTERN = /^[\p{L}\p{N}\s._-]{1,128}$/u;

/**
 * Sustituye la sesión activa por la del usuario recién registrado.
 * Se usa tras crear una cuenta para evitar arrastrar el usuario anterior.
 */
export const activateRegisteredSession = (username: string) => {
    const name = sanitizeBrowserStorageValue(username, 64);
    if (!name || !STORAGE_VALUE_PATTERN.test(name)) return false;

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

const setOrClear = (key: string, value?: string | null, maxLength = 128) => {
  const sanitized = sanitizeBrowserStorageValue(value, maxLength);
  if (sanitized) {
    localStorage.setItem(key, sanitized);
  } else {
    localStorage.removeItem(key);
  }
};

export const persistUserSession = (username: string, options: PersistUserSessionOptions) => {
  const name = sanitizeBrowserStorageValue(username, 64);
  const friendCode = sanitizeBrowserStorageValue(options.friendCode, 32);
  if (!name || !STORAGE_VALUE_PATTERN.test(name)) return false;
  if (!friendCode || !STORAGE_VALUE_PATTERN.test(friendCode)) return false;

  localStorage.setItem('yovi_user', name);
  localStorage.setItem('yovi_friend_code', friendCode);
  setOrClear('yovi_user_icon', options.icon, 128);
  setOrClear('yovi_user_language', options.language, 32);
  setOrClear('yovi_user_nickname', options.nickname, 64);
  return true;
};
