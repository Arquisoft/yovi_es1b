import jwt from 'jsonwebtoken'

// Usa la misma secret que el middleware
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_super_segura_2026'

/**
 * Genera un token JWT válido para pruebas
 * @param {Object} payload - Datos del token (username, nickname, etc)
 * @returns {string} Token JWT
 */
export const generateTestToken = (payload = { username: 'TestUser', nickname: 'TestNickname' }) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })
}

/**
 * Helper para agregar token a las cookies de una petición
 * @param {Object} req - Objeto de petición de supertest
 * @param {string} token - Token JWT
 * @returns {Object} La misma petición con el token agregado
 */
export const withAuthToken = (req, token) => {
  return req.set('Cookie', `token=${token}`)
}

