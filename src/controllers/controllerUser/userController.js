const UserData = require('../../data/userData');
const UserModel = require('../../models/UserModel');
const bcrypt = require('bcrypt');
const PetModel = require('../../models/PetModel');

const UserController = {
    /**
     * Crear un nuevo usuario
     */
    createUser: async (req, res, next) => {
        try {
            const userData = req.body;
            
            // Validación básica
            if (!userData.email || !userData.password) {
                const error = new Error('Email y contraseña son requeridos');
                error.statusCode = 400;
                return next(error);
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
            next(error);
        }
    },
    
    /**
     * Obtener todos los usuarios (admin)
     */
    getAllUsers: async (req, res, next) => {
        try {
            // Verificar permisos de administrador
            if (req.user.role !== 'admin') {
                const error = new Error('No tienes permiso para acceder a esta información');
                error.statusCode = 403;
                return next(error);
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
            next(error);
        }
    },
    
    /**
     * Obtener perfil del usuario autenticado
     */
    getProfile: async (req, res, next) => {
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
            next(error);
        }
    },
    
    /**
     * Actualizar perfil de usuario
     */
    updateProfile: async (req, res, next) => {
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
            next(error);
        }
    },
    
    /**
     * Actualizar configuración de privacidad
     */
    updatePrivacy: async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { is_profile_public, show_contact } = req.body;
            
            // Validación básica
            if (is_profile_public === undefined && show_contact === undefined) {
                const error = new Error('Se requiere al menos un campo de privacidad para actualizar');
                error.statusCode = 400;
                return next(error);
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
            next(error);
        }
    },
    
    /**
     * Actualizar foto de perfil
     */
    updateProfilePicture: async (req, res, next) => {
        try {
            const userId = req.user.id;
            
            // Validar que se haya subido un archivo
            if (!req.file) {
                const error = new Error('No se ha proporcionado una imagen');
                error.statusCode = 400;
                return next(error);
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
            next(error);
        }
    },
    
    /**
     * Eliminar foto de perfil
     */
    removeProfilePicture: async (req, res, next) => {
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
            next(error);
        }
    },
    
    /**
     * Desactivar cuenta de usuario
     */
    deactivateAccount: async (req, res, next) => {
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
            next(error);
        }
    },
    
    /**
     * Cambiar estado de activación de un usuario (activar/desactivar) - Solo admin
     */
    toggleUserStatus: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { active } = req.body; // true para activar, false para desactivar
            
            // Verificar permisos de administrador
            if (req.user.role !== 'admin') {
                const error = new Error('No tienes permiso para realizar esta acción');
                error.statusCode = 403;
                return next(error);
            }
            
            // Buscar usuario
            const targetUser = await UserModel.findById(id);
            
            if (!targetUser) {
                const error = new Error('Usuario no encontrado');
                error.statusCode = 404;
                return next(error);
            }
            
            // Prevenir cambios en cuentas de administradores
            if (targetUser.role === 'admin' && !active) {
                const error = new Error('No se puede desactivar la cuenta de un administrador');
                error.statusCode = 403;
                return next(error);
            }
            
            // Verificar si el estado actual es el mismo que se solicita
            if (targetUser.is_active === active) {
                const error = new Error(`El usuario ya está ${active ? 'activado' : 'desactivado'}`);
                error.statusCode = 400;
                return next(error);
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
            next(error);
        }
    },
    
    /**
     * Obtener un usuario por ID (admin)
     */
    getUserById: async (req, res, next) => {
        try {
            const { id } = req.params;
            
            // Verificar permisos de administrador
            if (req.user.role !== 'admin') {
                const error = new Error('No tienes permiso para acceder a esta información');
                error.statusCode = 403;
                return next(error);
            }
            
            // Delegar la lógica de negocio a userData
            const user = await UserData.getUserById(id);
            
            // Verificar si el usuario existe
            if (!user) {
                const error = new Error('Usuario no encontrado');
                error.statusCode = 404;
                return next(error);
            }
            
            // Respuesta HTTP
            return res.status(200).json({
                ok: true,
                user
            });
        } catch (error) {
            console.error('Error al obtener usuario por ID:', error);
            next(error);
        }
    },
    
    /**
     * Obtener perfil público de un usuario
     */
    getPublicUserProfile: async (req, res, next) => {
        try {
            const { id } = req.params;
            
            // Delegar la lógica de negocio a userData
            const user = await UserData.getUserById(id);
            
            // Verificar si el usuario existe
            if (!user) {
                const error = new Error('Usuario no encontrado');
                error.statusCode = 404;
                return next(error);
            }
            
            // Verificar si el perfil es público
            if (!user.is_profile_public) {
                const error = new Error('Este perfil no es público');
                error.statusCode = 403;
                return next(error);
            }
            
            // Filtrar información para perfil público (solo datos no sensibles)
            const publicProfile = {
                _id: user._id,
                name: user.name,
                profile_picture: user.profile_picture,
                // Solo incluir información de contacto si el usuario lo permite
                phone: user.show_contact ? user.phone : undefined,
                email: user.show_contact ? user.email : undefined,
                city: user.city,
                state: user.state,
                country: user.country,
                bio: user.bio,
                gender: user.gender
            };
            
            // Respuesta HTTP
            return res.status(200).json({
                ok: true,
                profile: publicProfile
            });
        } catch (error) {
            console.error('Error al obtener perfil público:', error);
            next(error);
        }
    },
    
    /**
     * Obtener mascotas públicas de un usuario
     */
    getUserPets: async (req, res, next) => {
        try {
            const { id } = req.params;
            
            // Verificar si el usuario existe
            const user = await UserData.getUserById(id);
            if (!user) {
                const error = new Error('Usuario no encontrado');
                error.statusCode = 404;
                return next(error);
            }
            
            // Verificar si el perfil es público
            if (!user.is_profile_public) {
                const error = new Error('Este perfil no es público');
                error.statusCode = 403;
                return next(error);
            }
            
            // Buscar las mascotas del usuario
            const pets = await PetModel.find({ 
                owner: id
            }, {
                // Solo incluir campos no sensibles
                _id: 1,
                name: 1,
                species: 1,
                breed: 1,
                gender: 1,
                color: 1,
                profile_picture: 1,
                status: 1
            });
            
            // Respuesta HTTP
            return res.status(200).json({
                ok: true,
                pets
            });
        } catch (error) {
            console.error('Error al obtener mascotas del usuario:', error);
            next(error);
        }
    }
};

module.exports = UserController;
