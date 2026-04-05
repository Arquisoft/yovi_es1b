const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_super_segura_2026';

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Contendrá { username, nickname, etc }
        next();
    } catch (err) {
        res.status(403).json({ error: 'Token inválido o expirado.' });
    }
};

module.exports = { authMiddleware, JWT_SECRET };