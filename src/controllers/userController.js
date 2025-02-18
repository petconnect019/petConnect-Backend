const UserModel = require('../models/UserModel');
const { uploadToCloudinary } = require('../utils/cloudinary');

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
                return res.status(400).json({ message: 'User already exists' });
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
            
            res.status(201).json({ message: 'User created successfully', userId: user._id });
        } catch (error) {
            console.error('Error creating user:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    getAllUsers: async (req, res) => {
        try {
            const users = await UserModel.find({}, '-password');
            res.status(200).json(users);
        } catch (error) {
            console.error('Error al obtener usuarios:', error);
            res.status(500).json({ message: 'Error al obtener usuarios' });
        }
    },

    getProfile: async (req, res) => {
        try {
            const userId = req.user.id;
            const user = await UserModel.findById(userId).select('-password');
            
            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }

            res.status(200).json(user);
        } catch (error) {
            console.error('Error al obtener perfil:', error);
            res.status(500).json({ message: 'Error al obtener perfil' });
        }
    },

    deleteUser: async (req, res) => {
        try {
            const userId = req.params.id;
            const user = await UserModel.findByIdAndDelete(userId);

            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }

            res.status(200).json({ message: 'Usuario eliminado exitosamente' });
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            res.status(500).json({ message: 'Error al eliminar usuario' });
        }
    },

    updateProfile: async (req, res) => {
        try {
            const userId = req.user.id;
            const { name, city, phone } = req.body;
            let updateData = { name, city, phone };

            if (req.file) {
                const result = await uploadToCloudinary(req.file.path);
                updateData.profile_picture = result.secure_url;
            }

            const user = await UserModel.findByIdAndUpdate(
                userId,
                updateData,
                { new: true, select: '-password' }
            );

            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }

            res.status(200).json(user);
        } catch (error) {
            console.error('Error al actualizar perfil:', error);
            res.status(500).json({ message: 'Error al actualizar perfil' });
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
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }

            res.status(200).json(user);
        } catch (error) {
            console.error('Error al actualizar privacidad:', error);
            res.status(500).json({ message: 'Error al actualizar privacidad' });
        }
    },

    getUserById: async (req, res) => {
        try {
            const userId = req.params.id;
            const user = await UserModel.findById(userId).select('-password');

            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }

            res.status(200).json(user);
        } catch (error) {
            console.error('Error al obtener usuario:', error);
            res.status(500).json({ message: 'Error al obtener usuario' });
        }
    }
};

module.exports = UserController;
