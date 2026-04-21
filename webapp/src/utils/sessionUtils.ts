/**
 * Recupera el nombre de usuario de la sesión actual.
 * Se usa para que Rust identifique qué partida cargar.
 */
export const getCurrentUser = (): string => {
    // Al no usar sessionStorage para el username si queremos que el frontend lo sepa,
    // podríamos guardarlo en localStorage o estado, pero para mantener la refactorización mínima
    // lo mantenemos o lo pasamos a localStorage si el requerimiento es solo quitar el sessionStorage de auth.
    // Dejémoslo en localStorage por ahora.
    return localStorage.getItem('username') || '';
};

/**
 * Limpia la sesión local (Logout).
 */
export const clearSession = () => {
    localStorage.removeItem('username');
};

/**
 * Habilita una sesión de invitado.
 */
export const enableGuestSession = () => {
    localStorage.setItem('username', 'Invitado');
    localStorage.setItem('yovi_user', 'Invitado');
    localStorage.setItem('yovi_user_nickname', 'Invitado');
    localStorage.setItem('yovi_friend_code', 'GUEST');
};

/**
 * Limpia la sesión de invitado si existe.
 */
export const clearGuestSession = () => {
    if (localStorage.getItem('username') === 'Invitado') {
        clearSession();
        localStorage.removeItem('yovi_user');
        localStorage.removeItem('yovi_user_nickname');
        localStorage.removeItem('yovi_friend_code');
    }
};

/**
 * Retorna true si la sesión actual es de invitado.
 */
export const isGuestSession = (): boolean => {
    return localStorage.getItem('username') === 'Invitado';
};
