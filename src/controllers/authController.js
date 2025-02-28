const nodemailer = require('nodemailer');
const crypto = require('crypto');
const UserModel = require('../models/UserModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../services/emailService');
const { handleAuthenticationSuccess, clearSession } = require('../config/session');
const tokenService = require('../services/tokenService');

// Validaciones comunes
const validateEmail = (email) => {
    if (!email) return { isValid: false, error: 'El email es requerido' };
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    return emailRegex.test(email) 
        ? { isValid: true }
        : { isValid: false, error: 'Formato de email inválido' };
};

const validatePassword = (password) => {
    if (!password) return { isValid: false, error: 'La contraseña es requerida' };
    return password.length >= 6
        ? { isValid: true }
        : { isValid: false, error: 'La contraseña debe tener al menos 6 caracteres' };
};

const AuthController = {
    registerUser: async (req, res) => {
        try {
            console.log('Iniciando registro de usuario');
            const { email, password } = req.body;

            // Validar email
            const emailValidation = validateEmail(email);
            if (!emailValidation.isValid) {
                return res.status(400).json({
                    ok: false,
                    message: emailValidation.error,
                    errors: { email: emailValidation.error }
                });
            }

            // Validar contraseña
            const passwordValidation = validatePassword(password);
            if (!passwordValidation.isValid) {
                return res.status(400).json({
                    ok: false,
                    message: passwordValidation.error,
                    errors: { password: passwordValidation.error }
                });
            }

            // Verificar si el usuario ya existe
            const userExists = await UserModel.findOne({ email });
            if (userExists) {
                return res.status(400).json({ 
                    ok: false,
                    message: 'El usuario ya existe' 
                });
            }

            // Crear nuevo usuario
            const user = new UserModel({
                email,
                password,
                name: email.split('@')[0],
                role: 'user',
                is_profile_public: true,
                show_contact: true
            });

            await user.save();
            console.log('Usuario guardado exitosamente:', user._id);

            // Manejar autenticación
            const { accessToken, userResponse } = await handleAuthenticationSuccess(req, res, user);

            return res.status(201).json({
                ok: true,
                message: 'Usuario registrado exitosamente',
                accessToken,
                user: userResponse
            });

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
            console.log('Iniciando proceso de login');
            const { email, password } = req.body;

            // Validar email
            const emailValidation = validateEmail(email);
            if (!emailValidation.isValid) {
                return res.status(400).json({
                    ok: false,
                    message: emailValidation.error,
                    errors: { email: emailValidation.error }
                });
            }

            // Validar contraseña
            const passwordValidation = validatePassword(password);
            if (!passwordValidation.isValid) {
                return res.status(400).json({
                    ok: false,
                    message: passwordValidation.error,
                    errors: { password: passwordValidation.error }
                });
            }

            // Buscar usuario y verificar credenciales
            const user = await UserModel.findOne({ email });
            if (!user || !(await bcrypt.compare(password, user.password))) {
                return res.status(400).json({
                    ok: false,
                    message: 'Credenciales inválidas'
                });
            }

            // Manejar autenticación
            const { accessToken, userResponse } = await handleAuthenticationSuccess(req, res, user);

            return res.status(200).json({
                ok: true,
                message: 'Login exitoso',
                accessToken,
                user: userResponse
            });

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
            const emailValidation = validateEmail(email);
            if (!emailValidation.isValid) {
                return res.status(400).json({
                    ok: false,
                    message: emailValidation.error
                });
            }
    
            const user = await UserModel.findOne({ email });
            if (!user) {
                return res.status(200).json({ 
                    message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña' 
                });
            }
    
            const resetToken = crypto.randomBytes(32).toString('hex');

            // Crear fecha actual en Colombia (UTC-5)
            const colombiaTime = new Date();
            // Ajustar a la zona horaria de Colombia
            colombiaTime.setHours(colombiaTime.getHours() - 5);
            // Agregar 5 minutos para la expiración
            const resetTokenExpiration = new Date(colombiaTime.getTime() + 5 * 60 * 1000);

          
    
            await UserModel.findByIdAndUpdate(user._id, {
                reset_token: resetToken,
                reset_token_expiration: resetTokenExpiration
            });
    
            const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
            await sendEmail({
                to: email,
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

            // Ajustar la hora actual a Colombia 
            const colombiaTime = new Date(new Date().getTime() - (5 * 60 * 60 * 1000));

            // Buscar usuario con token válido
            const user = await UserModel.findOne({
                reset_token: resetToken,
                reset_token_expiration: { $gt: colombiaTime }
            });

            if (!user) {
                return res.status(400).json({ 
                    message: 'Token inválido o expirado' 
                });
            }

            // Actualizar contraseña y limpiar token
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await UserModel.findByIdAndUpdate(user._id, {
                password: hashedPassword,
                reset_token: null,
                reset_token_expiration: null
            });

            res.status(200).json({ 
                message: 'Contraseña restablecida con éxito' 
            });

        } catch (error) {
            console.error('Error al restablecer contraseña:', error);
            res.status(500).json({ 
                message: 'Error al restablecer la contraseña' 
            });
        }
    },
    changePassword: async (req, res) => {
        try {
            const userId = req.user.id; // Asumiendo que el middleware de autenticación añade el ID del usuario al objeto req
            const { currentPassword, newPassword } = req.body;

            // Verificar que el usuario existe
            const user = await UserModel.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }

            // Verificar la contraseña actual
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Contraseña actual incorrecta' });
            }

            // Hashear la nueva contraseña
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Actualizar la contraseña
            user.password = hashedPassword;
            await user.save();

            res.status(200).json({ message: 'Contraseña actualizada exitosamente' });
        } catch (error) {
            console.error('Error al cambiar la contraseña:', error);
            res.status(500).json({ message: 'Error al cambiar la contraseña' });
        }
    },

    googleAuthCallback: async (req, res) => {
        try {
            const { accessToken, userResponse } = await handleAuthenticationSuccess(req, res, req.user);

            const responseData = {
                ok: true,
                message: 'Login con Google exitoso',
                accessToken,
                user: userResponse
            };

            res.send(`
                <html>
                <body>
                    <script>
                        if (window.opener) {
                            window.opener.postMessage(${JSON.stringify(responseData)}, '${process.env.FRONTEND_URL}');
                            window.close();
                        } else {
                            window.location.href = '${process.env.FRONTEND_URL}/step-pet';
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
