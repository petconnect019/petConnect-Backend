const session = require('express-session');
const MongoStore = require('connect-mongo');
const tokenService = require('../services/tokenService');

// Configuración base de la sesión
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'tu_secreto_aqui',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'sessions'
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1 día
        sameSite: 'lax',
        domain: 'localhost'
    }
};

//  separacion de logica de session en el apartado cookies
const handleAuthenticationSuccess = async (req, res, user) => {
    try {
        // Inicializar sesión
        req.session.userId = user._id;
        req.session.userEmail = user.email;
        await req.session.save();
       

        // Generar tokens
        const { accessToken, refreshToken, expiresIn } = await tokenService.generateTokens(user);

        // Configurar cookie para refresh token
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 20 * 24 * 60 * 60 * 1000, // 20 días
            path: '/', // Ruta de la cookie visible para todas las rutas
            domain: 'localhost'
        };

        
        res.cookie('refreshToken', refreshToken, cookieOptions);

        // Configurar cookie de sesión
        res.cookie('connect.sid', req.sessionID, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000,// 1 día
        });

        // Preparar objeto de usuario para la respuesta
        const userResponse = {
            id: user._id,
            email: user.email,
            name: user.name,
            profile_picture: user.profile_picture || null,
            role: user.role,
            is_profile_public: user.is_profile_public,
            show_contact: user.show_contact,
            country: user.country,
            state: user.state,
            address: user.address,
            city: user.city,
            phone: user.phone
        };

        return {
            accessToken,
            userResponse
        };
    } catch (error) {
        throw error;
    }
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
const clearSession = async (req, res) => {
    try {
        await req.session.destroy();
        res.clearCookie('connect.sid', {path: '/'});
        res.clearCookie('refreshToken', { path: '/' });
        return true;
    } catch (error) {
        return false;
    }
};

module.exports = {
    sessionConfig: session(sessionConfig),
    handleAuthenticationSuccess,
    sessionLogger,
    isAuthenticated,
    clearSession
};
