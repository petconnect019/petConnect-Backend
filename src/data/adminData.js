const UserModel = require('../models/UserModel');
const bcrypt = require('bcrypt');

const AdminData = {
    /**
     * Obtiene todos los usuarios (para administradores)
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
     * Elimina un usuario (para administradores)
     */
    deleteUser: async (userId) => {
        try {
            const user = await UserModel.findByIdAndDelete(userId);
            if (!user) {
                throw new Error('Usuario no encontrado');
            }
            return true;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Registra un nuevo usuario (incluyendo administradores)
     */
    registerUser: async (userData, currentUserRole) => {
        try {   
            const { name, email, password, role } = userData;

            // Verificar si el usuario que está creando es un admin
            if (role === 'admin') {
                if (currentUserRole !== 'admin') {
                    throw new Error('Solo un administrador puede crear otros administradores.');
                }
            }

            // Verificar si el usuario ya existe
            const existingUser = await UserModel.findOne({ email });
            if (existingUser) {
                throw new Error('El usuario ya existe');
            }

            // Hashear la contraseña
            const hashedPassword = await bcrypt.hash(password, 10);

            // Crear usuario
            const newUser = new UserModel({
                name: name,
                email,
                password: hashedPassword,
                role: role || 'user',
                gender: gender || 'no especificado'

            });

            await newUser.save();
            return newUser;
        } catch (error) {
            throw error;
        }
    }
};

module.exports = AdminData;
