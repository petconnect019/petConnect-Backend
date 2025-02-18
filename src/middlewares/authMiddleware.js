const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');

const verifyToken = (req, res, next) => {
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

        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Acceso denegado' });
        }

        next();
    } catch (error) {
        console.error('Error al verificar rol de admin:', error);
        res.status(500).json({ message: 'Error al verificar permisos' });
    }
};

module.exports = {
    verifyToken,
    isAdmin
}; 