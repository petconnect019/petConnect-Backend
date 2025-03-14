const UserModel = require('../models/UserModel');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

const UserData = {
    /**
     * Crea un nuevo usuario
     */
    createUser: async (userData) => {
        try {
            // Verificar si el usuario ya existe
            const existingUser = await UserModel.findOne({
                $or: [
                    { google_id: userData.google_id },
                    { email: userData.email }
                ]
            });
            
            if (existingUser) {
                throw new Error('El usuario ya existe');
            }
            
            if (userData.password) {
                const bcrypt = require('bcrypt');
                const salt = await bcrypt.genSalt(10);
                userData.password = await bcrypt.hash(userData.password, salt);
            }
            
            // Crear el usuario
            const user = new UserModel(userData);
            await user.save();
            
            return user;
        } catch (error) {
            throw error;
        }
    },
    
    /**
     * Obtiene todos los usuarios
     */
    getAllUsers: async () => {
        try {
            const users = await UserModel.find({}, '-password');
            return users;
        } catch (error) {
            throw error;
        }
    },
    
    /**
     * Obtiene un usuario por su ID
     */
    getUserById: async (userId) => {
        try {
            const user = await UserModel.findById(userId).select('-password');
            if (!user) {
                throw new Error('Usuario no encontrado');
            }
            return user;
        } catch (error) {
            throw error;
        }
    },
    
    /**
     * Obtiene el perfil del usuario actual
     */
    getProfile: async (userId) => {
        try {
            const user = await UserModel.findById(userId).select('-password');
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
     */
    updateProfile: async (userId, updateData, profilePictureBuffer = null, mimeType = null) => {
        try {
            let profilePictureUrl = null;
            
            // Si hay una nueva foto de perfil
            if (profilePictureBuffer) {
                const user = await UserModel.findById(userId);
                if (user.profile_picture) {
                    await deleteFromCloudinary(user.profile_picture);
                }
                
                const result = await uploadToCloudinary(profilePictureBuffer, mimeType);
                profilePictureUrl = result.secure_url;
                updateData.profile_picture = profilePictureUrl;
            }
            
            const user = await UserModel.findByIdAndUpdate(
                userId,
                updateData,
                { new: true, select: '-password' }
            );
            
            if (!user) {
                throw new Error('Usuario no encontrado');
            }
            
            return user;
        } catch (error) {
            throw error;
        }
    },
    
    /**
     * Actualiza la configuración de privacidad de un usuario
     */
    updatePrivacy: async (userId, privacySettings) => {
        try {
            const user = await UserModel.findByIdAndUpdate(
                userId,
                {
                    is_profile_public: privacySettings.isProfilePublic,
                    show_contact: privacySettings.showContact
                },
                { new: true, select: '-password' }
            );
            
            if (!user) {
                throw new Error('Usuario no encontrado');
            }
            
            return user;
        } catch (error) {
            throw error;
        }
    },
    
    /**
     * Actualiza la foto de perfil de un usuario
     */
    updateProfilePicture: async (userId, profilePictureBuffer, mimeType) => {
        try {
            const user = await UserModel.findById(userId);
            if (!user) {
                throw new Error('Usuario no encontrado');
            }
            
            // Eliminar foto anterior si existe
            if (user.profile_picture) {
                await deleteFromCloudinary(user.profile_picture);
            }
            
            // Subir nueva foto
            const result = await uploadToCloudinary(profilePictureBuffer, mimeType);
            
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
     */
    deleteUser: async (userId) => {
        try {
            const user = await UserModel.findById(userId);
            if (!user) {
                throw new Error('Usuario no encontrado');
            }
            
            // Eliminar foto de perfil de Cloudinary si existe
            if (user.profile_picture) {
                try {
                    await deleteFromCloudinary(user.profile_picture);
                } catch (deleteError) {
                    console.error('Error al eliminar imagen de Cloudinary:', deleteError);
                }
            }
            
            await UserModel.findByIdAndDelete(userId);
            return true;
        } catch (error) {
            throw error;
        }
    }
};

module.exports = UserData;
