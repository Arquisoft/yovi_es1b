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