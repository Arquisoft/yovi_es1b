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
 * Limpia la sesión (útil para el Logout).
 */
export const clearSession = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('username');
};