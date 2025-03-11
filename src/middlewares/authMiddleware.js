const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');
const tokenService = require('../services/tokenService');

const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'Token no proporcionado' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token inválido' });
    }
};

const isAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Acceso denegado' });
        }

        next();
    } catch (error) {
        console.error('Error al verificar rol de admin:', error);
        res.status(500).json({ message: 'Error al verificar permisos' });
    }
};

/**
 * Middleware para autenticación opcional
 */
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return next();
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        // Si hay error en el token, continuar sin autenticar
        next();
    }
};

module.exports = {
    verifyToken,
    isAdmin,
    optionalAuth
}; 