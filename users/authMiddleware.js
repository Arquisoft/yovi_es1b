const jwt = require('jsonwebtoken');

// Verificamos si JWT_SECRET esta definida
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('FATAL ERROR: JWT_SECRET is not defined in production.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_super_segura_2026';

const authMiddleware = (req, res, next) => {
    const token = extractToken(req);

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    }

    try {
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token inválido o expirado.' });
    }
};

function extractToken(req) {
    return req.cookies?.token || getBearerToken(req.headers.authorization);
}

function getBearerToken(authorizationHeader) {
    const authHeader = String(authorizationHeader || '');

    if (!authHeader.startsWith('Bearer ')) {
        return '';
    }

    return authHeader.slice('Bearer '.length).trim();
}

function verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
}

module.exports = { authMiddleware, JWT_SECRET };
