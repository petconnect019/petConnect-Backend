const express = require('express');
const passport = require("passport");
const jwt = require('jsonwebtoken');
const router = express.Router();
const bcrypt = require('bcrypt');
const UserModel = require('../models/UserModel'); 
const AuthController = require('../controllers/authController');
const { sendEmail } = require('../services/emailService');
const { verifyToken } = require('../middlewares/authMiddleware');

// Autenticación local
router.post('/register', AuthController.registerUser);
router.post('/login', AuthController.loginUser);

// Restablecimiento de contraseña
router.post('/request-password-reset', AuthController.requestPasswordReset);
router.post('/reset-password', AuthController.resetPassword);

// Ruta para iniciar la autenticación con Google
router.get('/google',
    passport.authenticate('google', { 
        scope: ['profile', 'email'],
        prompt: 'select_account'
    })
);

// Callback URL para Google
router.get('/google/callback',
    passport.authenticate('google', { 
        failureRedirect: 'http://localhost:5173/login',
        session: true
    }),
    (req, res) => {
        try {
            const token = jwt.sign(
                { 
                    id: req.user._id,
                    email: req.user.email,
                    role: req.user.role 
                },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            // Página de redirección con verificación de window.opener
            res.send(`
                <html>
                <body>
                    <script>
                        if (window.opener) {
                            window.opener.postMessage({ token: '${token}' }, 'http://localhost:5173');
                            window.close();
                        } else {
                            // Si no hay window.opener, redirigir directamente
                            window.location.href = 'http://localhost:5173/welcome?token=' + encodeURIComponent('${token}');
                        }
                    </script>
                </body>
                </html>
            `);
        } catch (error) {
            console.error('Error en callback de Google:', error);
            res.redirect('http://localhost:5173/login?error=auth_failed');
        }
    }
);

// Ruta para validar el token
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

// Ruta de prueba de email
router.post('/test-email', async (req, res) => {
    try {
        const testEmail = {
            to: 'connectpet3@gmail.com', // Usa el mismo correo para pruebas
            subject: 'Prueba de Correo PetConnect',
            html: `
                <h1>Prueba de Correo PetConnect</h1>
                <p>Esta es una prueba enviada el: ${new Date().toLocaleString()}</p>
            `
        };

        await sendEmail(testEmail);
        res.status(200).json({ 
            message: 'Email de prueba enviado correctamente',
            details: testEmail
        });
    } catch (error) {
        console.error('Error detallado:', error);
        res.status(500).json({ 
            message: 'Error al enviar email de prueba',
            error: error.message,
            details: {
                code: error.code,
                response: error.response
            }
        });
    }
});

// Ruta para cambiar la contraseña
router.post('/change-password', verifyToken, AuthController.changePassword);

// Agregar nueva ruta para refresh token
router.post('/refresh', AuthController.refreshToken);
router.post('/logout', AuthController.logout);

module.exports = router;
