const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');
const PetModel = require('../models/PetModel');
const tokenService = require('../services/tokenService');

const verifyToken = async (req, res, next) => {
    try {
        // Lista de rutas públicas que no requieren token
        const publicRoutes = [
            '/register',
            '/login',
            '/api/auth/register',
            '/api/auth/login',
            '/api/auth/refresh-token',
            '/health',
            '/api/health'
        ];

        // Verificar si la ruta actual es pública
        const currentPath = req.path;
        if (publicRoutes.some(route => currentPath.includes(route))) {
            return next();
        }

        // DEBUGGING PARA VER SI LLEGA AQUÍ
        console.log('=== DEBUGGING verifyToken ===');
        console.log('Ruta actual:', currentPath);
        console.log('Método:', req.method);
        console.log('Headers authorization:', req.headers.authorization);

        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            console.log('=== ERROR 401: Token no proporcionado ===');
            return res.status(401).json({ 
                ok: false,
                message: 'Token no proporcionado' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verificar si el usuario existe y está activo
        const user = await UserModel.findById(decoded.id);
        if (!user) {
            console.log('=== ERROR 401: Usuario no encontrado ===');
            console.log('Decoded ID:', decoded.id);
            return res.status(401).json({ 
                ok: false,
                message: 'Usuario no encontrado' 
            });
        }

        if (!user.is_active) {
            console.log('=== ERROR 403: Usuario desactivado ===');
            console.log('User ID:', decoded.id);
            console.log('User is_active:', user.is_active);
            return res.status(403).json({ 
                ok: false,
                message: 'Tu cuenta está desactivada. Por favor, contacta al administrador.' 
            });
        }

        // Agregar información del usuario a la solicitud
        req.user = {
            ...decoded,
            is_active: user.is_active
        };
        
        console.log('=== verifyToken EXITOSO ===');
        console.log('Usuario autenticado:', decoded.id);
        console.log('Rol:', decoded.role);
        console.log('User activo:', user.is_active);
        
        next();
    } catch (error) {
        console.log('=== ERROR 401: Token inválido ===');
        console.error('Error en verificación de token:', error);
        return res.status(401).json({ 
            ok: false,
            message: 'Token inválido' 
        });
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

/**
 * Middleware para verificar si el usuario es el dueño de la mascota o un administrador
 */
const isPetOwnerOrAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        const petId = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Si es admin, permitir acceso
        if (userRole === 'admin') {
            return next();
        }

        // Verificar si la mascota existe
        const pet = await PetModel.findById(petId);
        if (!pet) {
            return res.status(404).json({ message: 'Mascota no encontrada' });
        }

        // Verificar si el usuario es el dueño
        if (pet.owner.toString() !== userId) {
            return res.status(403).json({ message: 'No tienes permiso para realizar esta acción' });
        }

        next();
    } catch (error) {
        console.error('Error al verificar permisos:', error);
        res.status(500).json({ message: 'Error al verificar permisos' });
    }
};

module.exports = {
    verifyToken,
    isAdmin,
    optionalAuth,
    isPetOwnerOrAdmin
}; 