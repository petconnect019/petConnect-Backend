const nodemailer = require('nodemailer');
const crypto = require('crypto');
const UserModel = require('../../models/UserModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../../services/emailService');
const { handleAuthenticationSuccess, clearSession } = require('../../config/session');
const tokenService = require('../../services/tokenService');
const PetModel = require('../../models/PetModel');
const AuthData = require('../../data/authData');


const AuthController = {
    registerUser: async (req, res) => {
        try {
            const { email, password } = req.body;

            // Validar datos de entrada
            const emailValidation = AuthData.validateEmail(email);
            const passwordValidation = AuthData.validatePassword(password);
            
            if (!emailValidation.isValid) {
                return res.status(400).json({
                    ok: false,
                    message: emailValidation.error,
                    errors: { email: emailValidation.error }
                });
            }
            
            if (!passwordValidation.isValid) {
                return res.status(400).json({
                    ok: false,
                    message: passwordValidation.error,
                    errors: { password: passwordValidation.error }
                });
            }

            const userData = { ...req.body };

            try {
                const { user, isNewUser } = await AuthData.registerUser(userData);
                const { accessToken, userResponse } = await handleAuthenticationSuccess(req, res, user);
                
                return res.status(201).json({
                    ok: true,
                    message: 'Usuario registrado exitosamente',
                    accessToken,
                    user: userResponse,
                    isNewUser
                });
            } catch (error) {
                if (error.message === 'El usuario ya existe') {
                    return res.status(400).json({ 
                        ok: false,
                        message: 'El usuario ya existe' 
                    });
                }
                throw error;
            }
        } catch (error) {
            console.error('Error en registro:', error);
            return res.status(500).json({ 
                ok: false,
                message: 'Error al registrar usuario',
                errors: { server: 'Error interno del servidor' }
            });
        }
    },


    loginUser: async (req, res) => {
        try {
            const { email, password } = req.body;
            const emailValidation = AuthData.validateEmail(email);
            const passwordValidation = AuthData.validatePassword(password);
            
            if (!emailValidation.isValid) {
                return res.status(400).json({
                    ok: false,
                    message: emailValidation.error,
                    errors: { email: emailValidation.error }
                });
            }            
            if (!passwordValidation.isValid) {
                return res.status(400).json({
                    ok: false,
                    message: passwordValidation.error,
                    errors: { password: passwordValidation.error }
                });
            }
            try {
                const { user, hasPets, isNewUser } = await AuthData.loginUser(email, password);
                const { accessToken } = await handleAuthenticationSuccess(req, res, user);

                return res.status(200).json({
                    ok: true,
                    accessToken,
                    user,
                    hasPets,
                    isNewUser
                });
            } catch (error) {
                if (error.message === 'Credenciales inválidas') {
                    return res.status(400).json({
                        ok: false,
                        message: 'Credenciales inválidas'
                    });
                }
                throw error;
            }
        } catch (error) {
            console.error('Error en login:', error);
            return res.status(500).json({
                ok: false,
                message: 'Error en el servidor'
            });
        }
    },

    requestPasswordReset: async (req, res) => {
        try {
            const { email } = req.body;
    
            // Validar email
            const emailValidation = AuthData.validateEmail(email);
            if (!emailValidation.isValid) {
                return res.status(400).json({
                    ok: false,
                    message: emailValidation.error
                });
            }
    
            const resetData = await AuthData.requestPasswordReset(email);
            
            // Si no hay datos de restablecimiento, el usuario no existe, pero no lo revelamos
            if (!resetData) {
                return res.status(200).json({ 
                    message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña' 
                });
            }
    
            const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetData.resetToken}`;
            await sendEmail({
                to: resetData.email,
                subject: 'Restablecimiento de Contraseña',
                html: `
                    <h1>Restablecimiento de Contraseña</h1>
                    <p>Has solicitado restablecer tu contraseña.</p>
                    <p>Haz clic en el siguiente enlace para continuar:</p>
                    <a href="${resetUrl}">Restablecer Contraseña</a>
                    <p>Este enlace expirará en 5 minutos.</p>
                    <p>Si no solicitaste restablecer tu contraseña, ignora este mensaje.</p>
                `
            });
    
            res.status(200).json({ 
                ok: true,
                message: 'Email enviado exitosamente',
            });
        } catch (error) {
            console.error('Error al solicitar restablecimiento:', error);
            res.status(500).json({ 
                ok: false,
                message: 'Error al procesar la solicitud' 
            });
        }
    },
    
    resetPassword: async (req, res) => {
        try {
            const { resetToken, newPassword } = req.body;

            if (!resetToken || !newPassword) {
                return res.status(400).json({ 
                    message: 'Token y nueva contraseña son requeridos' 
                });
            }

            // Validar contraseña
            if (newPassword.length < 6) {
                return res.status(400).json({
                    message: 'La contraseña debe tener al menos 6 caracteres'
                });
            }

            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
            if (!passwordRegex.test(newPassword)) {
                return res.status(400).json({
                    message: 'La contraseña debe contener al menos una letra mayúscula, una minúscula y un número'
                });
            }

            try {
                await AuthData.resetPassword(resetToken, newPassword);
                
                res.status(200).json({ 
                    message: 'Contraseña restablecida con éxito' 
                });
            } catch (error) {
                if (error.message === 'Token inválido o expirado') {
                    return res.status(400).json({ 
                        message: 'Token inválido o expirado' 
                    });
                }
                throw error;
            }
        } catch (error) {
            console.error('Error al restablecer contraseña:', error);
            res.status(500).json({ 
                message: 'Error al restablecer la contraseña' 
            });
        }
    },
    
    changePassword: async (req, res) => {
        try {
            const userId = req.user.id;
            const { currentPassword, newPassword } = req.body;

            try {
                await AuthData.changePassword(userId, currentPassword, newPassword);
                
                res.status(200).json({ 
                    message: 'Contraseña actualizada exitosamente' 
                });
            } catch (error) {
                if (error.message === 'Usuario no encontrado') {
                    return res.status(404).json({ 
                        message: 'Usuario no encontrado' 
                    });
                }
                if (error.message === 'Contraseña actual incorrecta') {
                    return res.status(400).json({ 
                        message: 'Contraseña actual incorrecta' 
                    });
                }
                throw error;
            }
        } catch (error) {
            console.error('Error al cambiar la contraseña:', error);
            res.status(500).json({ 
                message: 'Error al cambiar la contraseña' 
            });
        }
    },

    googleAuthCallback: async (req, res) => {
        try {
            const { accessToken } = await handleAuthenticationSuccess(req, res, req.user);

            // Verificar si el usuario tiene mascotas y si es nuevo
            const { hasPets, isNewUser } = await AuthData.findOrCreateGoogleUser({
                id: req.user.google_id,
                emails: [{ value: req.user.email }],
                displayName: req.user.name,
                photos: [{ value: req.user.profile_picture }]
            });

            // Incluir todos los datos del usuario en la respuesta
            const responseData = {
                ok: true,
                message: 'Login con Google exitoso',
                accessToken,
                user: {
                    ...req.user,
                    gender: req.user.gender,
                    email: req.user.email,
                    name: req.user.name,
                    profile_picture: req.user.profile_picture,
                    role: req.user.role,
                    google_id: req.user.google_id,
                    created_at: req.user.created_at,
                    updated_at: req.user.updated_at
                },
                hasPets,
                isNewUser
            };

            res.send(`
                <html>
                <body>
                    <script>
                        if (window.opener) {
                            window.opener.postMessage(${JSON.stringify(responseData)}, '${process.env.FRONTEND_URL}');
                            window.close();
                        } else {
                            window.location.href = '${process.env.FRONTEND_URL}${isNewUser || !hasPets ? '/step-pet' : '/home'}';
                        }
                    </script>
                </body>
                </html>
            `);
        } catch (error) {
            console.error('Error en callback de Google:', error);
            res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
        }
    },

    refreshToken: async (req, res) => {
        try {
            const refreshToken = req.cookies.refreshToken;

            if (!refreshToken) {
                return res.status(401).json({
                    message: 'Refresh token no proporcionado'
                });
            }

            const user = await tokenService.verifyRefreshToken(refreshToken);

            if (!user) {
                return res.status(401).json({
                    message: 'Refresh token inválido o expirado'
                });
            }

            // Revocar el refresh token actual
            await tokenService.revokeRefreshToken(refreshToken);

            // Generar nuevos tokens
            const tokens = await tokenService.generateTokens(user);

            // Configurar nueva cookie
            res.cookie('refreshToken', tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 20 * 24 * 60 * 60 * 1000, // 20 días en milisegundos
                path: '/api/auth/refresh'
            });

            res.json({
                accessToken: tokens.accessToken
            });
        } catch (error) {
            console.error('Error refreshing token:', error);
            res.status(500).json({
                message: 'Error al renovar el token'
            });
        }
    },

    logout: async (req, res) => {
        try {
            const success = await clearSession(req, res);
            return res.status(success ? 200 : 500).json({
                ok: success,
                message: success ? 'Sesión cerrada exitosamente' : 'Error al cerrar sesión'
            });
        } catch (error) {
            console.error('Error en logout:', error);
            return res.status(500).json({
                ok: false,
                message: 'Error al cerrar sesión'
            });
        }
    }
};

module.exports = AuthController;
