

// URL del backend (se inyecta desde docker-compose o se usa localhost por defecto)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Tiempo límite en segundos según dificultad (Easy=60s, Medium=30s, Hard=15s)
const TURN_TIME_LIMIT: Record<string, number> = {
  Easy:   60,
  Medium: 30,
  Hard:   15,
};

export const DIFFICULTY_TRANSLATIONS: Record<string, "facil" | "medio" | "dificil"> = {
  Easy: "facil",
  Medium: "medio",
  Hard: "dificil",
};

// Y si necesitas el inverso para enviar datos al backend:
export const REVERSE_DIFFICULTY_MAP: Record<string, string> = {
  facil: "Easy",
  medio: "Medium",
  dificil: "Hard",
};


export { API_BASE_URL, TURN_TIME_LIMIT };