const nodemailer = require('nodemailer');
const crypto = require('crypto');
const UserModel = require('../models/UserModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../services/emailService');
const tokenService = require('../services/tokenService');

const AuthController = {
    registerUser: async (req, res) => {
        try {
            const { email, password } = req.body;

            // Validaciones básicas
            if (!email || !password) {
                return res.status(400).json({ 
                    message: 'Email y contraseña son requeridos',
                    errors: {
                        email: !email ? 'El email es requerido' : null,
                        password: !password ? 'La contraseña es requerida' : null
                    }
                });
            }

            // Validar formato de email
            const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    message: 'Formato de email inválido',
                    errors: {
                        email: 'Por favor ingresa un email válido'
                    }
                });
            }

            // Validar contraseña
            if (password.length < 6) {
                return res.status(400).json({
                    message: 'La contraseña es muy corta',
                    errors: {
                        password: 'La contraseña debe tener al menos 6 caracteres'
                    }
                });
            }

            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
            if (!passwordRegex.test(password)) {
                return res.status(400).json({
                    message: 'La contraseña no cumple con los requisitos',
                    errors: {
                        password: 'La contraseña debe contener al menos una letra mayúscula, una minúscula y un número'
                    }
                });
            }

            // Verificar si el usuario ya existe
            const userExists = await UserModel.findOne({ email });
            if (userExists) {
                return res.status(400).json({ message: 'El usuario ya existe' });
            }

            // Crear nuevo usuario
            const user = new UserModel({
                email,
                password
            });

            // Guardar usuario
            await user.save();

            res.status(201).json({ message: 'Usuario registrado exitosamente' });
        } catch (error) {
            console.warn('Error registering user:', error);
            res.status(500).json({ message: 'Error al registrar usuario' });
        }
    },

    loginUser: async (req, res) => {
        try {
            const { email, password } = req.body;

            // Validaciones básicas
            if (!email || !password) {
                return res.status(400).json({
                    message: 'Email y contraseña son requeridos',
                    errors: {
                        email: !email ? 'El email es requerido' : null,
                        password: !password ? 'La contraseña es requerida' : null
                    }
                });
            }

            // Buscar usuario
            const user = await UserModel.findOne({ email });
            if (!user) {
                return res.status(400).json({
                    message: 'Credenciales inválidas'
                });
            }

            // Verificar contraseña
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({
                    message: 'Credenciales inválidas'
                });
            }

            // Generar tokens
            const { accessToken, refreshToken, expiresIn } = await tokenService.generateTokens(user);

            // Configurar cookie para refresh token (20 días)
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 20 * 24 * 60 * 60 * 1000, // 20 días en milisegundos
                path: '/api/auth/refresh'
            });

            res.json({
                message: 'Login exitoso',
                accessToken,
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    profile_picture: user.profile_picture,
                    role: user.role,
                    is_profile_public: user.is_profile_public,
                    show_contact: user.show_contact,
                    city: user.city,
                    phone: user.phone
                }
            });
        } catch (error) {
            console.error('Error in login:', error);
            res.status(500).json({
                message: 'Error en el servidor'
            });
        }
    },

    requestPasswordReset: async (req, res) => {
        try {
            const { email } = req.body;

            // Buscar usuario por email usando Mongoose
            const user = await UserModel.findOne({ email });

            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }

            // Generar token de restablecimiento
            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetTokenExpiration = Date.now() + 3600000; // 1 hora

            // Actualizar usuario con el token usando Mongoose
            await UserModel.findByIdAndUpdate(user._id, {
                reset_token: resetToken,
                reset_token_expiration: resetTokenExpiration
            });

            // Enviar email
            const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`;
            const emailContent = `
                <h1>Restablecimiento de Contraseña</h1>
                <p>Has solicitado restablecer tu contraseña.</p>
                <p>Haz clic en el siguiente enlace para continuar:</p>
                <a href="${resetUrl}">Restablecer Contraseña</a>
                <p>Este enlace expirará en 1 hora.</p>
            `;

            await sendEmail({
                to: email,
                subject: 'Restablecimiento de Contraseña',
                html: emailContent
            });

            res.status(200).json({ 
                message: 'Instrucciones enviadas al correo electrónico' 
            });
        } catch (error) {
            console.error('Error al solicitar restablecimiento:', error);
            res.status(500).json({ 
                message: 'Error al procesar la solicitud' 
            });
        }
    },

    resetPassword: async (req, res) => {
        try {
            const { resetToken, newPassword } = req.body;

            // Buscar usuario con token válido usando Mongoose
            const user = await UserModel.findOne({
                reset_token: resetToken,
                reset_token_expiration: { $gt: Date.now() }
            });

            if (!user) {
                return res.status(400).json({ 
                    message: 'Token inválido o expirado' 
                });
            }

            // Hashear nueva contraseña
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Actualizar usuario usando Mongoose
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

    generateToken: (user) => {
        const payload = {
            id: user._id,
            email: user.email,
            name: user.name,
            profile_picture: user.profile_picture,
            role: user.role,
            is_profile_public: user.is_profile_public,
            show_contact: user.show_contact,
            city: user.city,
            phone: user.phone
        };

        return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
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
            const { googleId, email, name, profilePicture } = req.user; // Asumiendo que estos datos vienen del middleware de Google

            // Buscar o crear usuario
            let user = await UserModel.findOne({ google_id: googleId });

            if (!user) {
                user = new UserModel({
                    google_id: googleId,
                    email,
                    name,
                    profile_picture: profilePicture
                });
                await user.save();
            }

            // Generar token JWT
            const token = jwt.sign(
                { 
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    profile_picture: user.profile_picture,
                    role: user.role,
                    is_profile_public: user.is_profile_public,
                    show_contact: user.show_contact,
                    city: user.city,
                    phone: user.phone
                },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            res.json({
                message: 'Autenticación exitosa',
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    profile_picture: user.profile_picture,
                    role: user.role,
                    is_profile_public: user.is_profile_public,
                    show_contact: user.show_contact,
                    city: user.city,
                    phone: user.phone
                
                }
            });
        } catch (error) {
            console.error('Error en la autenticación con Google:', error);
            res.status(500).json({ message: 'Error en la autenticación con Google' });
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
            const refreshToken = req.cookies.refreshToken;

            if (refreshToken) {
                await tokenService.revokeRefreshToken(refreshToken);
            }

            res.clearCookie('refreshToken', {
                path: '/api/auth/refresh'
            });

            res.json({
                message: 'Logout exitoso'
            });
        } catch (error) {
            console.error('Error in logout:', error);
            res.status(500).json({
                message: 'Error al cerrar sesión'
            });
        }
    }
};

module.exports = AuthController;
