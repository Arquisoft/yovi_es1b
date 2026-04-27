const jwt = require('jsonwebtoken');

// Verificamos si JWT_SECRET está definida
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('FATAL ERROR: JWT_SECRET is not defined in production.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_super_segura_2026';

const resolveToken = (req) => {
    const authHeader = String(req.headers.authorization || '');
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';

    // LOG DE PRECISIÓN
    const cookieToken = req.cookies?.token;
    const safePath = req.path.replace(/[^\w/\-.]/g, '');
    console.log(`[CHECK] Ruta: ${safePath} | Cookie: ${cookieToken ? 'SÍ' : 'NO'} | Header: ${bearerToken ? 'SÍ' : 'NO'}`);

    
    return req.cookies?.token || bearerToken;
};

const authMiddleware = (req, res, next) => {
    const token = resolveToken(req);

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Contendrá { username, nickname, etc }
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token inválido o expirado.' });
    }
};

const optionalAuthMiddleware = (req, res, next) => {
    const token = resolveToken(req);
    if (!token) {
        req.user = null;
        next();
        return;
    }

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (_err) {
        res.status(401).json({ error: 'Token inválido o expirado.' });
    }
};

module.exports = { authMiddleware, optionalAuthMiddleware, JWT_SECRET };
