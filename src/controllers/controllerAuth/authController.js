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
    registerUser: async (req, res, next) => {
        try {
            const { email, password } = req.body;

            // Validar datos de entrada
            const emailValidation = AuthData.validateEmail(email);
            const passwordValidation = AuthData.validatePassword(password);
            
            if (!emailValidation.isValid) {
                const error = new Error(emailValidation.error);
                error.statusCode = 400;
                return next(error);
            }
            
            if (!passwordValidation.isValid) {
                const error = new Error(passwordValidation.error);
                error.statusCode = 400;
                return next(error);
            }

            const userData = { ...req.body };

            const { user, isNewUser } = await AuthData.registerUser(userData);
            const { accessToken, userResponse } = await handleAuthenticationSuccess(req, res, user);
            
            return res.status(201).json({
                success: true,
                message: 'Usuario registrado exitosamente',
                accessToken,
                user: {
                    ...userResponse
                },
                isNewUser
            });
        } catch (error) {
            next(error);
        }
    },


    loginUser: async (req, res, next) => {
        try {
            const { email, password } = req.body;
            const emailValidation = AuthData.validateEmail(email);
            const passwordValidation = AuthData.validatePassword(password);
            
            if (!emailValidation.isValid) {
                const error = new Error(emailValidation.error);
                error.statusCode = 400;
                return next(error);
            }            
            if (!passwordValidation.isValid) {
                const error = new Error(passwordValidation.error);
                error.statusCode = 400;
                return next(error);
            }

            const { user, hasPets } = await AuthData.loginUser(email, password);
            const tokens = await tokenService.generateTokens(user);

            // Establecer la cookie del refresh token
            res.cookie('refreshToken', tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 20 * 24 * 60 * 60 * 1000 // 20 días
            });

            return res.status(200).json({
                success: true,
                accessToken: tokens.accessToken,
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role
                },
                hasPets,
                isNewUser
            });
        } catch (error) {
            next(error);
        }
    },

    requestPasswordReset: async (req, res, next) => {
        try {
            const { email } = req.body;
    
            // Validar email
            const emailValidation = AuthData.validateEmail(email);
            if (!emailValidation.isValid) {
                const error = new Error(emailValidation.error);
                error.statusCode = 400;
                return next(error);
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
            next(error);
        }
    },
    
    resetPassword: async (req, res, next) => {
        try {
            const { resetToken, newPassword } = req.body;

            if (!resetToken || !newPassword) {
                const error = new Error('Token y nueva contraseña son requeridos');
                error.statusCode = 400;
                return next(error);
            }

            // Validar contraseña
            if (newPassword.length < 6) {
                const error = new Error('La contraseña debe tener al menos 6 caracteres');
                error.statusCode = 400;
                return next(error);
            }

            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
            if (!passwordRegex.test(newPassword)) {
                const error = new Error('La contraseña debe contener al menos una letra mayúscula, una minúscula y un número');
                error.statusCode = 400;
                return next(error);
            }

            await AuthData.resetPassword(resetToken, newPassword);
            
            res.status(200).json({ 
                message: 'Contraseña restablecida con éxito' 
            });
        } catch (error) {
            next(error);
        }
    },
    
    changePassword: async (req, res) => {
        try {
            const userId = req.user.id;
            const { currentPassword, newPassword } = req.body;

            // Validar que se proporcionaron ambas contraseñas
            if (!currentPassword || !newPassword) {
                return res.status(400).json({ 
                    message: 'La contraseña actual y la nueva contraseña son requeridas' 
                });
            }

            // Validar nueva contraseña
            if (newPassword.length < 8) {
                return res.status(400).json({ 
                    message: 'La contraseña debe tener al menos 8 caracteres' 
                });
            }

            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
            if (!passwordRegex.test(newPassword)) {
                return res.status(400).json({ 
                    message: 'La contraseña debe contener al menos una letra mayúscula, una minúscula y un número' 
                });
            }

            try {
                await AuthData.changePassword(userId, currentPassword, newPassword);
                
                res.status(200).json({ 
                    message: 'Contraseña actualizada exitosamente' 
                });
            } catch (error) {
                console.error('Error específico al cambiar contraseña:', error);
                
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
                if (error.message === 'Error en la configuración de la cuenta') {
                    return res.status(500).json({ 
                        message: 'Error en la configuración de la cuenta. Por favor, contacta al soporte.' 
                    });
                }
                if (error.message === 'La contraseña actual es requerida') {
                    return res.status(400).json({ 
                        message: 'La contraseña actual es requerida' 
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
            // Flujo normal para ambientes 
            const { accessToken } = await handleAuthenticationSuccess(req, res, req.user);
            const { hasPets, isNewUser } = await AuthData.findOrCreateGoogleUser({
                id: req.user.google_id,
                emails: [{ value: req.user.email }],
                displayName: req.user.name,
                photos: [{ value: req.user.profile_picture }]
            });

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

            return res.status(200).send(`<html><body><script>if(window.opener){window.opener.postMessage(${JSON.stringify(responseData)}, "${process.env.FRONTEND_URL}");window.close();}else{window.location.href = "${process.env.FRONTEND_URL}${isNewUser || !hasPets ? '/step-pet' : '/home'}";}</script></body></html>`);
        } catch (error) {
            console.error('Error en callback de Google:', error);
            res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
        }
    },

    refreshToken: async (req, res) => {
        try {
            // Verificar si existe el refresh token en las cookies
            if (!req.cookies || !req.cookies.refreshToken) {
                return res.status(401).json({
                    message: 'Refresh token no proporcionado'
                });
            }

            const refreshToken = req.cookies.refreshToken;
            
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
            return res.status(401).json({
                message: 'Refresh token no proporcionado'
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
