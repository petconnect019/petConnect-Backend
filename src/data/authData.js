const UserModel = require('../models/UserModel');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const PetModel = require('../models/PetModel');

const AuthData = {
    /**
     * Valida un email
     */
    validateEmail: (email) => {
        if (!email) return { isValid: false, error: 'El email es requerido' };
        const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
        return emailRegex.test(email) 
            ? { isValid: true }
            : { isValid: false, error: 'Formato de email inválido' };
    },

    /**
     * Valida una contraseña
     */
    validatePassword: (password) => {
        if (!password) return { isValid: false, error: 'La contraseña es requerida' };
        return password.length >= 6
            ? { isValid: true }
            : { isValid: false, error: 'La contraseña debe tener al menos 6 caracteres' };
    },

    /**
     * Registra un nuevo usuario
     */
    registerUser: async (userData) => {
        try {
            // Verificar si el usuario ya existe
            const userExists = await UserModel.findOne({ email: userData.email });
            if (userExists) {
                throw new Error('El usuario ya existe');
            }

            // Hashear la contraseña
            const hashedPassword = await bcrypt.hash(userData.password, 10);

            // Crear nuevo usuario
            const user = new UserModel({
              ...userData,
              password: hashedPassword,
            });

            await user.save();
            return {
                user,
                isNewUser: true
            };
        } catch (error) {
            throw error;
        }
    },

    /**
     * Inicia sesión de un usuario
     */
    loginUser: async (email, password) => {
        try {
            // Buscar usuario y verificar credenciales
            const user = await UserModel.findOne({ email }).select('+password +role');
            
            if (!user) {
                throw new Error('Credenciales inválidas');
            }

            // Verificar que tanto la contraseña como el hash existen
            if (!password || !user.password) {
                console.log('Contraseña o hash faltante:', { 
                    hasPassword: !!password, 
                    hasHashedPassword: !!user.password 
                });
                throw new Error('Credenciales inválidas');
            }
            
            // Comparar contraseñas
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                throw new Error('Credenciales inválidas');
            }

            // Verificar si el usuario tiene mascotas
            const hasPets = await PetModel.exists({ owner: user._id });

            // Limpiar la contraseña del objeto usuario antes de devolverlo
            const userObject = user.toObject();
            delete userObject.password;

            return {
                user: userObject,
                hasPets,
                isNewUser: false
            };
        } catch (error) {
            console.error('Error en loginUser:', error);
            throw error;
        }
    },

    /**
     * Solicita un restablecimiento de contraseña
     */
    requestPasswordReset: async (email) => {
        try {
            const user = await UserModel.findOne({ email });
            if (!user) {
                return null;
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

            return {
                email: user.email,
                resetToken
            };
        } catch (error) {
            throw error;
        }
    },
    
    /**
     * Restablece la contraseña de un usuario
     */
    resetPassword: async (resetToken, newPassword) => {
        try {
            // Ajustar la hora actual a Colombia 
            const colombiaTime = new Date(new Date().getTime() - (5 * 60 * 60 * 1000));

            // Buscar usuario con token válido
            const user = await UserModel.findOne({
                reset_token: resetToken,
                reset_token_expiration: { $gt: colombiaTime }
            });

            if (!user) {
                throw new Error('Token inválido o expirado');
            }

            // Actualizar contraseña y limpiar token
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await UserModel.findByIdAndUpdate(user._id, {
                password: hashedPassword,
                reset_token: null,
                reset_token_expiration: null
            });

            return true;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Cambia la contraseña de un usuario
     */
    changePassword: async (userId, currentPassword, newPassword) => {
        try {
            // Verificar que el usuario existe
            const user = await UserModel.findById(userId);
            if (!user) {
                throw new Error('Usuario no encontrado');
            }

            // Verificar la contraseña actual
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                throw new Error('Contraseña actual incorrecta');
            }

            // Hashear la nueva contraseña
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Actualizar la contraseña
            user.password = hashedPassword;
            await user.save();

            return true;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Verifica si un usuario existe por su ID de Google
     */
    findOrCreateGoogleUser: async (googleProfile) => {
        try {
            // Buscar usuario existente
            let user = await UserModel.findOne({ google_id: googleProfile.id });

            if (!user) {
                // Crear nuevo usuario si no existe
                user = await UserModel.create({
                    google_id: googleProfile.id,
                    email: googleProfile.emails[0].value,
                    name: googleProfile.displayName,
                    profile_picture: googleProfile.photos[0].value
                });
            }

            // Verificar si el usuario tiene mascotas
            const hasPets = await PetModel.exists({ owner: user._id });

            // Verificar si es un usuario nuevo 
            const isNewUser = user.createdAt && 
                            (new Date() - new Date(user.createdAt)) < 1000; // menos de 1 segundo

            return {
                user,
                hasPets,
                isNewUser
            };
        } catch (error) {
            throw error;
        }
    }
};

module.exports = AuthData; 