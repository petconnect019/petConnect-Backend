const express = require('express');
const passport = require("passport");
const jwt = require('jsonwebtoken');
const router = express.Router();
const AuthController = require('../controllers/controllerAuth/authController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Rutas públicas de autenticación
router.post('/login', AuthController.loginUser);
router.post('/logout', AuthController.logout);
router.post('/register', AuthController.registerUser);
router.post('/refresh', AuthController.refreshToken);

// Rutas públicas de gestión de contraseñas
router.post('/request-password-reset', AuthController.requestPasswordReset);
router.post('/reset-password', AuthController.resetPassword);

// Rutas de Google OAuth
router.get('/google',
    passport.authenticate('google', { 
        scope: ['profile', 'email'],
        prompt: 'select_account'
    })
);

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    AuthController.googleAuthCallback
);

// Middleware para rutas protegidas
router.use(verifyToken);

// Rutas protegidas que usan verificación de token:
// - /change-password
// - /validate
router.post('/change-password', AuthController.changePassword);
router.get('/validate', (req, res) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'Token no proporcionado' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.status(200).json({ message: 'Token válido', decoded });
    } catch (error) {
        res.status(403).json({ message: 'Token inválido o expirado' });
    }
});

module.exports = router;
