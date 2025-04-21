const UserModel = require('../models/UserModel');
const bcrypt = require('bcrypt');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

const UserData = {
    /**
     * Crea un nuevo usuario
     * @param {Object} userData - Datos del usuario a crear
     * @returns {Object} El usuario creado
     */
    createUser: async (userData) => {
        try {
            // Verificar si el usuario ya existe
            const existingUser = await UserModel.findOne({ email: userData.email });
            if (existingUser) {
                throw new Error('El usuario ya existe');
            }
            
            // Si hay contraseña, encriptarla
            if (userData.password) {
                const salt = await bcrypt.genSalt(10);
                userData.password = await bcrypt.hash(userData.password, salt);
            }
            
            // Asegurar que el rol siempre sea 'user' a menos que se especifique otra cosa
            userData.role = userData.role || 'user';
            
            // Crear y guardar el usuario
            const user = new UserModel(userData);
            await user.save();
            
            // Quitar la contraseña antes de devolver el usuario
            const userObject = user.toObject();
            delete userObject.password;
            
            return userObject;
        } catch (error) {
            throw error;
        }
    },
    
    /**
     * Obtiene todos los usuarios
     * @param {boolean} includeInactive - Si es true, incluye usuarios inactivos
     * @returns {Array} Lista de usuarios
     */
    getAllUsers: async (includeInactive = false) => {
        try {
            const query = includeInactive ? {} : { is_active: true };
            const users = await UserModel.find(query, '-password');
            return users;
        } catch (error) {
            throw error;
        }
    },
    
    /**
     * Obtiene el perfil de un usuario
     * @param {string} userId - ID del usuario
     * @returns {Object} Perfil del usuario
     */
    getProfile: async (userId) => {
        try {
            const user = await UserModel.findOne({ _id: userId, is_active: true }, '-password');
            
            if (!user) {
                throw new Error('Usuario no encontrado');
            }
            
            return user;
        } catch (error) {
            throw error;
        }
    },
    
    /**
     * Actualiza el perfil de un usuario
     * @param {string} userId - ID del usuario
     * @param {Object} updateData - Datos a actualizar
     * @returns {Object} Perfil actualizado
     */
    updateProfile: async (userId, updateData) => {
        try {
            // Obtener el usuario
            const user = await UserModel.findById(userId);
            
            if (!user) {
                throw new Error('Usuario no encontrado');
            }
            
            // Actualizar solo los campos permitidos
            const allowedFields = ['name', 'phone', 'city', 'state', 'country', 'address', 'gender'];
            
            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    user[field] = updateData[field];
                }
            });
            
            await user.save();
            
            return user;
        } catch (error) {
            throw error;
        }
    },
    
    /**
     * Actualiza la configuración de privacidad de un usuario
     * @param {string} userId - ID del usuario
     * @param {Object} privacySettings - Configuración de privacidad
     * @returns {Object} Configuración actualizada
     */
    updatePrivacy: async (userId, privacySettings) => {
        try {
            const user = await UserModel.findById(userId);
            
            if (!user) {
                throw new Error('Usuario no encontrado');
            }
            
            // Actualizar configuración de privacidad
            if (privacySettings.is_profile_public !== undefined) {
                user.is_profile_public = privacySettings.is_profile_public;
            }
            
            if (privacySettings.show_contact !== undefined) {
                user.show_contact = privacySettings.show_contact;
            }
            
            await user.save();
            
            return {
                is_profile_public: user.is_profile_public,
                show_contact: user.show_contact
            };
        } catch (error) {
            throw error;
        }
    },
    
    /**
     * Actualiza la foto de perfil de un usuario
     * @param {string} userId - ID del usuario
     * @param {Buffer} photoBuffer - Buffer de la imagen
     * @param {string} mimeType - Tipo MIME de la imagen
     * @returns {string} URL de la nueva foto de perfil
     */
    updateProfilePicture: async (userId, photoBuffer, mimeType) => {
        try {
            const user = await UserModel.findById(userId);
            
            if (!user) {
                throw new Error('Usuario no encontrado');
            }
            
            // Eliminar foto anterior si existe
            if (user.profile_picture) {
                await deleteFromCloudinary(user.profile_picture);
            }
            
            // Subir la nueva foto
            const result = await uploadToCloudinary(photoBuffer, mimeType);
            
            // Actualizar usuario
            user.profile_picture = result.secure_url;
            await user.save();
            
            return result.secure_url;
        } catch (error) {
            throw error;
        }
    },
    
    /**
     * Elimina un usuario
     * @param {string} userId - ID del usuario a eliminar
     * @returns {boolean} true si se eliminó correctamente
     */
    deleteUser: async (userId) => {
        try {
            const user = await UserModel.findById(userId);
            
            if (!user) {
                throw new Error('Usuario no encontrado');
            }
            
            // Marcar como inactivo en lugar de eliminar
            user.is_active = false;
            await user.save();
            
            return true;
        } catch (error) {
            throw error;
        }
    },
    
    /**
     * Obtiene un usuario por ID
     * @param {string} userId - ID del usuario
     * @param {boolean} includeInactive - Si es true, incluye usuarios inactivos
     * @returns {Object} Datos del usuario
     */
    getUserById: async (userId, includeInactive = false) => {
        try {
            const query = { _id: userId };
            if (!includeInactive) {
                query.is_active = true;
            }
            
            const user = await UserModel.findOne(query, '-password');
            
            if (!user) {
                throw new Error('Usuario no encontrado');
            }
            
            return user;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Elimina la foto de perfil de un usuario
     * @param {string} userId - ID del usuario
     * @returns {boolean} true si se eliminó correctamente
     */
    removeProfilePicture: async (userId) => {
        try {
            const user = await UserModel.findById(userId);
            
            if (!user) {
                throw new Error('Usuario no encontrado');
            }
            
            if (user.profile_picture) {
                await deleteFromCloudinary(user.profile_picture);
                user.profile_picture = null;
                await user.save();
            }
            
            return true;
        } catch (error) {
            throw error;
        }
    }
};

module.exports = UserData;
