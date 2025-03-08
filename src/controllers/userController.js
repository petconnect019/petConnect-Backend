const UserData = require('../data/userData');

const UserController = {
    createUser: async (req, res) => {
        try {
            const { google_id, name, email, profile_picture, role } = req.body;

            const userData = {
                google_id,
                name,
                email,
                profile_picture,
                role: role || 'user'
            };

            try {
                const user = await UserData.createUser(userData);
                
                res.status(201).json({ 
                    ok: true,
                    message: 'Usuario creado exitosamente', 
                    userId: user._id 
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
            console.error('Error al crear usuario:', error);
            res.status(500).json({ 
                ok: false,
                message: 'Error al crear usuario',
                error: error.message 
            });
        }
    },

    getAllUsers: async (req, res) => {
        try {
            const users = await UserData.getAllUsers();
            res.status(200).json({
                ok: true,
                users
            });
        } catch (error) {
            res.status(500).json({
                ok: false,
                message: 'Error al obtener usuarios',
                error: error.message
            });
        }
    },

    getProfile: async (req, res) => {
        try {
            const userId = req.user.id;
            
            try {
                const user = await UserData.getProfile(userId);
                
                res.status(200).json({
                    ok: true,
                    user
                });
            } catch (error) {
                if (error.message === 'Usuario no encontrado') {
                    return res.status(404).json({
                        ok: false,
                        message: 'Usuario no encontrado'
                    });
                }
                throw error;
            }
        } catch (error) {
            res.status(500).json({
                ok: false,
                message: 'Error al obtener perfil',
                error: error.message
            });
        }
    },

    updateProfile: async (req, res) => {
        try {
            const userId = req.user.id;
            const { name, city, phone } = req.body;
            const updateData = { name, city, phone };
            
            const profilePictureBuffer = req.file ? req.file.buffer : null;
            const mimeType = req.file ? req.file.mimetype : null;
            
            const user = await UserData.updateProfile(userId, updateData, profilePictureBuffer, mimeType);
            
            res.status(200).json({
                ok: true,
                message: 'Perfil actualizado exitosamente',
                user
            });
        } catch (error) {
            res.status(500).json({
                ok: false,
                message: 'Error al actualizar perfil',
                error: error.message
            });
        }
    },

    updatePrivacy: async (req, res) => {
        try {
            const userId = req.user.id;
            const { isProfilePublic, showContact } = req.body;
            
            try {
                const user = await UserData.updatePrivacy(userId, { isProfilePublic, showContact });
                
                res.status(200).json({
                    ok: true,
                    message: 'Configuración de privacidad actualizada',
                    user
                });
            } catch (error) {
                if (error.message === 'Usuario no encontrado') {
                    return res.status(404).json({
                        ok: false,
                        message: 'Usuario no encontrado'
                    });
                }
                throw error;
            }
        } catch (error) {
            res.status(500).json({
                ok: false,
                message: 'Error al actualizar privacidad',
                error: error.message
            });
        }
    },

    updateProfilePicture: async (req, res) => {
        try {
            const userId = req.user.id;

            if (!req.file) {
                return res.status(400).json({
                    ok: false,
                    message: 'No se ha proporcionado ninguna imagen'
                });
            }

            const profilePictureUrl = await UserData.updateProfilePicture(
                userId, 
                req.file.buffer, 
                req.file.mimetype
            );
            
            res.status(200).json({
                ok: true,
                message: 'Foto de perfil actualizada exitosamente',
                profile_picture: profilePictureUrl
            });
        } catch (error) {
            console.error('Error general:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al actualizar la foto de perfil',
                error: error.message
            });
        }
    },

    deleteUser: async (req, res) => {
        try {
            const userId = req.params.id;
            
            try {
                await UserData.deleteUser(userId);
                
                res.status(200).json({
                    ok: true,
                    message: 'Usuario eliminado exitosamente'
                });
            } catch (error) {
                if (error.message === 'Usuario no encontrado') {
                    return res.status(404).json({
                        ok: false,
                        message: 'Usuario no encontrado'
                    });
                }
                throw error;
            }
        } catch (error) {
            res.status(500).json({
                ok: false,
                message: 'Error al eliminar usuario',
                error: error.message
            });
        }
    },

    getUserById: async (req, res) => {
        try {
            const userId = req.params.id;
            
            try {
                const user = await UserData.getUserById(userId);
                
                res.status(200).json({
                    ok: true,
                    user
                });
            } catch (error) {
                if (error.message === 'Usuario no encontrado') {
                    return res.status(404).json({
                        ok: false,
                        message: 'Usuario no encontrado'
                    });
                }
                throw error;
            }
        } catch (error) {
            res.status(500).json({
                ok: false,
                message: 'Error al obtener usuario',
                error: error.message
            });
        }
    }
};

module.exports = UserController;
