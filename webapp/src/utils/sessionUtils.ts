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
