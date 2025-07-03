const session = require('express-session');
const MongoStore = require('connect-mongo');
const tokenService = require('../services/tokenService');
const jwt = require('jsonwebtoken');

// Verificar que la variable de entorno esté disponible
if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI no está definida en las variables de entorno');
    console.log('Variables de entorno disponibles:', Object.keys(process.env));
}

// Configuración base de la sesión
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'tu_secreto_aqui',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        dbName: 'petconnect',
        collectionName: 'sessions',
        ttl: 24 * 60 * 60, // 1 día en segundos
        autoRemove: 'native',
        touchAfter: 24 * 3600 // 24 horas
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1 día
        sameSite: 'lax'
    }
};

//  separacion de logica de session en el apartado cookies
const handleAuthenticationSuccess = async (req, res, user) => {
    const accessToken = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1d' }
    );

    const userResponse = {
        id: user._id,
        email: user.email,
        name: user.name || '',
        phone: user.phone || '',
        profile_picture: user.profile_picture || '',
        gender: user.gender || '',
        country: user.country || '',
        state: user.state || '',
        city: user.city || '',
        address: user.address || '',
        role: user.role
    };

    return { accessToken, userResponse };
};

// Middleware para logging de sesión
const sessionLogger = (req, res, next) => {
    next();
};

// Middleware para verificar sesión
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).json({ 
            ok: false,
            message: 'No autorizado' 
        });
    }
};

// Middleware para limpiar sesión
const clearSession = (req, res) => {
    if (req.session) {
        req.session.destroy();
    }
    res.clearCookie('connect.sid');
    return true;
};

module.exports = {
    sessionConfig: session(sessionConfig),
    handleAuthenticationSuccess,
    sessionLogger,
    isAuthenticated,
    clearSession
};
