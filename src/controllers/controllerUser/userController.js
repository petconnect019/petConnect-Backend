const UserData = require('../../data/userData');
const UserModel = require('../../models/UserModel');
const bcrypt = require('bcrypt');

/**
 * Determina el código de estado HTTP basado en el tipo de error
 * @param {Error} error - El error capturado
 * @returns {number} Código de estado HTTP
 */
const determineStatusCode = (error) => {
    if (error.message.includes('no encontrado') || error.message.includes('No encontrado')) {
        return 404;
    } else if (error.message.includes('permiso') || error.message.includes('autorizado')) {
        return 403;
    } else if (error.message.includes('requerido') || error.message.includes('inválido') || error.message.includes('ya existe')) {
        return 400;
    } else {
        return 500;
    }
};

const UserController = {
    /**
     * Crear un nuevo usuario
     */
    createUser: async (req, res) => {
        try {
            const userData = req.body;
            
            // Validación básica
            if (!userData.email || !userData.password) {
                return res.status(400).json({
                    ok: false,
                    message: 'Email y contraseña son requeridos'
                });
            }
            
            // Delegar la lógica de negocio a userData
            const newUser = await UserData.createUser(userData);
            
            // Respuesta HTTP
            return res.status(201).json({
                ok: true,
                message: 'Usuario creado exitosamente',
                user: newUser
            });
        } catch (error) {
            console.error('Error al crear usuario:', error);
            const statusCode = determineStatusCode(error);
            return res.status(statusCode).json({
                ok: false,
                message: 'Error al crear usuario',
                error: error.message
            });
        }
    },
    
    /**
     * Obtener todos los usuarios (admin)
     */
    getAllUsers: async (req, res) => {
        try {
            // Verificar permisos de administrador
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    ok: false,
                    message: 'No tienes permiso para acceder a esta información'
                });
            }
            
            // Delegar la lógica de negocio a userData
            const users = await UserData.getAllUsers();
            
            // Respuesta HTTP
            return res.status(200).json({
                ok: true,
                users
            });
        } catch (error) {
            console.error('Error al obtener usuarios:', error);
            const statusCode = determineStatusCode(error);
            return res.status(statusCode).json({
                ok: false,
                message: 'Error al obtener usuarios',
                error: error.message
            });
        }
    },
    
    /**
     * Obtener perfil del usuario autenticado
     */
    getProfile: async (req, res) => {
        try {
            const userId = req.user.id;
            
            // Delegar la lógica de negocio a userData
            const profile = await UserData.getProfile(userId);
            
            // Respuesta HTTP
            return res.status(200).json({
                ok: true,
                profile
            });
        } catch (error) {
            console.error('Error al obtener perfil:', error);
            const statusCode = determineStatusCode(error);
            return res.status(statusCode).json({
                ok: false,
                message: 'Error al obtener perfil',
                error: error.message
            });
        }
    },
    
    /**
     * Actualizar perfil de usuario
     */
    updateProfile: async (req, res) => {
        try {
            const userId = req.user.id;
            const updateData = req.body;
            
            // Delegar la lógica de negocio a userData
            const updatedProfile = await UserData.updateProfile(userId, updateData);
            
            // Respuesta HTTP
            return res.status(200).json({
                ok: true,
                message: 'Perfil actualizado exitosamente',
                profile: updatedProfile
            });
        } catch (error) {
            console.error('Error al actualizar perfil:', error);
            const statusCode = determineStatusCode(error);
            return res.status(statusCode).json({
                ok: false,
                message: 'Error al actualizar perfil',
                error: error.message
            });
        }
    },
    
    /**
     * Actualizar configuración de privacidad
     */
    updatePrivacy: async (req, res) => {
        try {
            const userId = req.user.id;
            const { is_profile_public, show_contact } = req.body;
            
            // Validación básica
            if (is_profile_public === undefined && show_contact === undefined) {
                return res.status(400).json({
                    ok: false,
                    message: 'Se requiere al menos un campo de privacidad para actualizar'
                });
            }
            
            // Delegar la lógica de negocio a userData
            const updatedPrivacy = await UserData.updatePrivacy(userId, { is_profile_public, show_contact });
            
            // Respuesta HTTP
            return res.status(200).json({
                ok: true,
                message: 'Configuración de privacidad actualizada',
                privacy: updatedPrivacy
            });
        } catch (error) {
            console.error('Error al actualizar privacidad:', error);
            const statusCode = determineStatusCode(error);
            return res.status(statusCode).json({
                ok: false,
                message: 'Error al actualizar configuración de privacidad',
                error: error.message
            });
        }
    },
    
    /**
     * Actualizar foto de perfil
     */
    updateProfilePicture: async (req, res) => {
        try {
            const userId = req.user.id;
            
            // Validar que se haya subido un archivo
            if (!req.file) {
                return res.status(400).json({
                    ok: false,
                    message: 'No se ha proporcionado una imagen'
                });
            }
            
            const { buffer, mimetype } = req.file;
            
            // Delegar la lógica de negocio a userData
            const profilePictureUrl = await UserData.updateProfilePicture(userId, buffer, mimetype);
            
            // Respuesta HTTP
            return res.status(200).json({
                ok: true,
                message: 'Foto de perfil actualizada exitosamente',
                profilePicture: profilePictureUrl
            });
        } catch (error) {
            console.error('Error al actualizar foto de perfil:', error);
            const statusCode = determineStatusCode(error);
            return res.status(statusCode).json({
                ok: false,
                message: 'Error al actualizar foto de perfil',
                error: error.message
            });
        }
    },
    
    /**
     * Eliminar foto de perfil
     */
    removeProfilePicture: async (req, res) => {
        try {
            const userId = req.user.id;
            
            // Delegar la lógica de negocio a userData
            await UserData.removeProfilePicture(userId);
            
            // Respuesta HTTP
            return res.status(200).json({
                ok: true,
                message: 'Foto de perfil eliminada exitosamente'
            });
        } catch (error) {
            console.error('Error al eliminar foto de perfil:', error);
            const statusCode = determineStatusCode(error);
            return res.status(statusCode).json({
                ok: false,
                message: 'Error al eliminar foto de perfil',
                error: error.message
            });
        }
    },
    
    /**
     * Desactivar cuenta de usuario
     */
    deleteUser: async (req, res) => {
        try {
            const userId = req.user.id;
            
            // Delegar la lógica de negocio a userData
            await UserData.deleteUser(userId);
            
            // Respuesta HTTP
            return res.status(200).json({
                ok: true,
                message: 'Cuenta desactivada exitosamente'
            });
        } catch (error) {
            console.error('Error al desactivar cuenta:', error);
            const statusCode = determineStatusCode(error);
            return res.status(statusCode).json({
                ok: false,
                message: 'Error al desactivar cuenta',
                error: error.message
            });
        }
    },
    
    /**
     * Cambiar estado de activación de un usuario (activar/desactivar) - Solo admin
     */
    toggleUserStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { active } = req.body; // true para activar, false para desactivar
            
            // Verificar permisos de administrador
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    ok: false,
                    message: 'No tienes permiso para realizar esta acción'
                });
            }
            
            // Buscar usuario
            const targetUser = await UserModel.findById(id);
            
            if (!targetUser) {
                return res.status(404).json({
                    ok: false,
                    message: 'Usuario no encontrado'
                });
            }
            
            // Prevenir cambios en cuentas de administradores
            if (targetUser.role === 'admin' && !active) {
                return res.status(403).json({
                    ok: false,
                    message: 'No se puede desactivar la cuenta de un administrador'
                });
            }
            
            // Verificar si el estado actual es el mismo que se solicita
            if (targetUser.is_active === active) {
                return res.status(400).json({
                    ok: false,
                    message: `El usuario ya está ${active ? 'activado' : 'desactivado'}`
                });
            }
            
            // Actualizar estado
            targetUser.is_active = active;
            await targetUser.save();
            
            // Respuesta HTTP
            return res.status(200).json({
                ok: true,
                message: `Usuario ${active ? 'activado' : 'desactivado'} exitosamente`
            });
        } catch (error) {
            console.error('Error al cambiar estado del usuario:', error);
            const statusCode = determineStatusCode(error);
            return res.status(statusCode).json({
                ok: false,
                message: 'Error al cambiar estado del usuario',
                error: error.message
            });
        }
    },
    
    /**
     * Obtener un usuario por ID (admin)
     */
    getUserById: async (req, res) => {
        try {
            const { id } = req.params;
            
            // Verificar permisos de administrador
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    ok: false,
                    message: 'No tienes permiso para acceder a esta información'
                });
            }
            
            // Delegar la lógica de negocio a userData
            const user = await UserData.getUserById(id);
            
            // Verificar si el usuario existe
            if (!user) {
                return res.status(404).json({
                    ok: false,
                    message: 'Usuario no encontrado'
                });
            }
            
            // Respuesta HTTP
            return res.status(200).json({
                ok: true,
                user
            });
        } catch (error) {
            console.error('Error al obtener usuario por ID:', error);
            const statusCode = determineStatusCode(error);
            return res.status(statusCode).json({
                ok: false,
                message: 'Error al obtener usuario',
                error: error.message
            });
        }
    },
    
    /**
     * Obtener perfil público de un usuario
     */
    getPublicUserProfile: async (req, res) => {
        try {
            const { id } = req.params;
            
            // Delegar la lógica de negocio a userData
            const user = await UserData.getUserById(id);
            
            // Verificar si el usuario existe
            if (!user) {
                return res.status(404).json({
                    ok: false,
                    message: 'Usuario no encontrado'
                });
            }
            
            // Filtrar información para perfil público
            const publicProfile = {
                _id: user._id,
                name: user.name,
                profile_picture: user.profile_picture,
                // Solo incluir información de contacto si el usuario lo permite
                phone: user.show_contact ? user.phone : undefined,
                email: user.show_contact ? user.email : undefined,
                city: user.city,
                state: user.state,
                country: user.country
            };
            
            // Respuesta HTTP
            return res.status(200).json({
                ok: true,
                profile: publicProfile
            });
        } catch (error) {
            console.error('Error al obtener perfil público:', error);
            const statusCode = determineStatusCode(error);
            return res.status(statusCode).json({
                ok: false,
                message: 'Error al obtener perfil público',
                error: error.message
            });
        }
    },
    
    /**
     * Desactivar cuenta del propio usuario
     */
    deactivateAccount: async (req, res) => {
        try {
            const userId = req.user.id;
            
            // Verificar si la contraseña es correcta (seguridad adicional)
            const { password } = req.body;
            
            if (password) {
                // Obtener usuario con contraseña incluida
                const user = await UserModel.findById(userId).select('+password');
                
                if (!user) {
                    return res.status(404).json({
                        ok: false,
                        message: 'Usuario no encontrado'
                    });
                }
                
                // Verificar contraseña
                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) {
                    return res.status(400).json({
                        ok: false,
                        message: 'Contraseña incorrecta'
                    });
                }
            }
            
            // Desactivar cuenta
            await UserData.deleteUser(userId);
            
            // Respuesta HTTP
            return res.status(200).json({
                ok: true,
                message: 'Tu cuenta ha sido desactivada exitosamente'
            });
        } catch (error) {
            console.error('Error al desactivar cuenta:', error);
            const statusCode = determineStatusCode(error);
            return res.status(statusCode).json({
                ok: false,
                message: 'Error al desactivar tu cuenta',
                error: error.message
            });
        }
    }
};

module.exports = UserController;
