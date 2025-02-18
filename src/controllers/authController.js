const nodemailer = require('nodemailer');
const crypto = require('crypto');
const UserModel = require('../models/UserModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../services/emailService');

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
                    message: 'Credenciales inválidas',
                    errors: {
                        auth: 'Email o contraseña incorrectos'
                    }
                });
            }

            // Verificar contraseña
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({
                    message: 'Credenciales inválidas',
                    errors: {
                        auth: 'Email o contraseña incorrectos'
                    }
                });
            }

            // Generar token JWT
            const token = jwt.sign(
                { 
                    id: user._id,
                    email: user.email,
                    role: user.role 
                },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            res.json({
                message: 'Login exitoso',
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    role: user.role
                }
            });
        } catch (error) {
            console.error('Error in login:', error);
            res.status(500).json({
                message: 'Error en el servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
            role: user.role
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
    }
};

module.exports = AuthController;
