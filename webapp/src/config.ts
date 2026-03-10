// URL del backend (se inyecta desde docker-compose o se usa localhost por defecto)
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
