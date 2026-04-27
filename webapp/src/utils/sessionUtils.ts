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
    const storedUsername = sessionStorage.getItem('username');
    if (!storedUsername) {
        if (isGuestSession()) {
            sessionStorage.setItem('username', GUEST_USERNAME);
            return GUEST_USERNAME;
        }
        return '';
    }

    const normalized = normalizeStorageValue(storedUsername, 64);
    if (!normalized || !USERNAME_PATTERN.test(normalized)) {
        sessionStorage.removeItem('username');
        return '';
    }

    return normalized;
};

/**
 * Marca la sesión actual como invitado temporal.
 */
export const enableGuestSession = () => {
    sessionStorage.setItem('yovi_guest', '1');
    if (!sessionStorage.getItem('username')) {
        sessionStorage.setItem('username', GUEST_USERNAME);
    }
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
    if (sessionStorage.getItem('username') === GUEST_USERNAME) {
        sessionStorage.removeItem('username');
    }
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

const USERNAME_PATTERN = /^[\p{L}\p{N}\s._-]{1,64}$/u;
const GUEST_USERNAME = 'Invitado';
const STORAGE_VALUE_PATTERN = /^[\p{L}\p{N}\s._-]{1,128}$/u;
const TOKEN_PATTERN = /^[A-Za-z0-9._~+/=-]{1,4096}$/;

const normalizeStorageValue = (value?: string | null, maxLength = 128) => {
  const trimmed = String(value ?? '').normalize('NFKC').trim().slice(0, maxLength);
  return trimmed;
};

const isSafeStorageValue = (value: string, pattern: RegExp) => pattern.test(value);

/**
 * Sustituye la sesión activa por la del usuario recién registrado.
 * Se usa tras crear una cuenta para evitar arrastrar el usuario anterior.
 */
export const activateRegisteredSession = (username: string) => {
    const name = normalizeStorageValue(username, 64);
    if (!name || !USERNAME_PATTERN.test(name)) return false;

    clearSession();
    sessionStorage.setItem('username', name);
    return true;
};

export const persistAuthToken = (token?: string | null) => {
  const normalized = normalizeStorageValue(token, 4096);
  if (!normalized || !TOKEN_PATTERN.test(normalized)) {
    sessionStorage.removeItem('token');
    return false;
  }

  sessionStorage.setItem('token', normalized);
  return true;
};

type PersistUserSessionOptions = {
  friendCode: string;
  icon?: string | null;
  language?: string | null;
  nickname?: string | null;
};

const setOrClear = (key: string, value?: string | null, maxLength = 128) => {
  const normalized = normalizeStorageValue(value, maxLength);
  if (normalized && isSafeStorageValue(normalized, STORAGE_VALUE_PATTERN)) {
    localStorage.setItem(key, normalized);
  } else {
    localStorage.removeItem(key);
  }
};



export const persistUserSession = (username: string, options: PersistUserSessionOptions) => {
  const name = normalizeStorageValue(username, 64);
  const friendCode = normalizeStorageValue(options.friendCode, 32).replace(/^#/, '');
  if (!name || !USERNAME_PATTERN.test(name)) return false;
  if (!friendCode || !STORAGE_VALUE_PATTERN.test(friendCode)) return false;

  localStorage.setItem('yovi_user', name);
  localStorage.setItem('yovi_friend_code', friendCode);
  setOrClear('yovi_user_icon', options.icon, 128);
  setOrClear('yovi_user_language', options.language, 32);
  setOrClear('yovi_user_nickname', options.nickname, 64);
  return true;
};
