const UserModel = require('../models/UserModel');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

const UserController = {
    createUser: async (req, res) => {
        try {
            const { google_id, name, email, profile_picture, role } = req.body;

            // Verificar si el usuario ya existe
            let user = await UserModel.findOne({
                $or: [
                    { google_id: google_id },
                    { email: email }
                ]
            });

            if (user) {
                return res.status(400).json({ 
                    ok: false,
                    message: 'El usuario ya existe' 
                });
            }

            // Crear el usuario
            user = new UserModel({
                google_id,
                name,
                email,
                profile_picture,
                role: role || 'user'
            });

            await user.save();

            res.status(201).json({ 
                ok: true,
                message: 'Usuario creado exitosamente', 
                userId: user._id 
            });
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
            const users = await UserModel.find({}, '-password');
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
            const user = await UserModel.findById(userId).select('-password');

            if (!user) {
                return res.status(404).json({
                    ok: false,
                    message: 'Usuario no encontrado'
                });
            }

            res.status(200).json({
                ok: true,
                user
            });
        } catch (error) {
            res.status(500).json({
                ok: false,
                message: 'Error al obtener perfil',
                error: error.message
            });
        }
    },

    deleteUser: async (req, res) => {
        try {
            const userId = req.params.id;
            const user = await UserModel.findById(userId);

            if (!user) {
                return res.status(404).json({
                    ok: false,
                    message: 'Usuario no encontrado'
                });
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

            res.status(200).json({
                ok: true,
                message: 'Usuario eliminado exitosamente'
            });
        } catch (error) {
            res.status(500).json({
                ok: false,
                message: 'Error al eliminar usuario',
                error: error.message
            });
        }
    },

    updateProfile: async (req, res) => {
        try {
            const userId = req.user.id;
            const { name, city, phone } = req.body;
            let updateData = { name, city, phone };

            // Si hay una nueva foto de perfil
            if (req.file) {
                try {
                    const user = await UserModel.findById(userId);
                    if (user.profile_picture) {
                        await deleteFromCloudinary(user.profile_picture);
                    }
                    
                    const result = await uploadToCloudinary(req.file.path);
                    updateData.profile_picture = result.secure_url;
                } catch (uploadError) {
                    console.error('Error al procesar la imagen:', uploadError);
                    return res.status(500).json({
                        ok: false,
                        message: 'Error al procesar la imagen del perfil'
                    });
                }
            }

            const user = await UserModel.findByIdAndUpdate(
                userId,
                updateData,
                { new: true, select: '-password' }
            );

            if (!user) {
                return res.status(404).json({
                    ok: false,
                    message: 'Usuario no encontrado'
                });
            }

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

            const user = await UserModel.findByIdAndUpdate(
                userId,
                {
                    is_profile_public: isProfilePublic,
                    show_contact: showContact
                },
                { new: true, select: '-password' }
            );

            if (!user) {
                return res.status(404).json({
                    ok: false,
                    message: 'Usuario no encontrado'
                });
            }

            res.status(200).json({
                ok: true,
                message: 'Configuración de privacidad actualizada',
                user
            });
        } catch (error) {
            res.status(500).json({
                ok: false,
                message: 'Error al actualizar privacidad',
                error: error.message
            });
        }
    },

    getUserById: async (req, res) => {
        try {
            const userId = req.params.id;
            const user = await UserModel.findById(userId).select('-password');

            if (!user) {
                return res.status(404).json({
                    ok: false,
                    message: 'Usuario no encontrado'
                });
            }

            res.status(200).json({
                ok: true,
                user
            });
        } catch (error) {
            res.status(500).json({
                ok: false,
                message: 'Error al obtener usuario',
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

            const user = await UserModel.findById(userId);
            if (!user) {
                return res.status(404).json({
                    ok: false,
                    message: 'Usuario no encontrado'
                });
            }

            try {
                // Eliminar foto anterior si existe
                if (user.profile_picture) {
                    await deleteFromCloudinary(user.profile_picture);
                }

                // Subir nueva foto
                const result = await uploadToCloudinary(req.file.path);
                
                // Actualizar usuario
                user.profile_picture = result.secure_url;
                await user.save();

                res.status(200).json({
                    ok: true,
                    message: 'Foto de perfil actualizada exitosamente',
                    profile_picture: result.secure_url
                });
            } catch (cloudinaryError) {
                console.error('Error con Cloudinary:', cloudinaryError);
                res.status(500).json({
                    ok: false,
                    message: 'Error al procesar la imagen',
                    error: cloudinaryError.message
                });
            }
        } catch (error) {
            console.error('Error general:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al actualizar la foto de perfil',
                error: error.message
            });
        }
    }
};

module.exports = UserController;
