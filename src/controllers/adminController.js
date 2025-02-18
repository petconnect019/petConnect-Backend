const UserModel = require('../models/UserModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Función para obtener todos los usuarios
const getAllUsers = async (req, res) => {
    try {
        const users = await UserModel.find({}, '-password'); // Excluir el campo de contraseña
        res.status(200).json(users);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
    }
};

// Función para eliminar un usuario
const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await UserModel.findByIdAndDelete(id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.status(200).json({ message: 'Usuario eliminado con éxito' });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ message: 'Error al eliminar usuario', error: error.message });
    }
};

// Función para registrar un nuevo usuario (incluyendo superadministrador)
const registerUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Verificar si el usuario que está creando es un superadmin
        if (role === 'admin') {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Solo un administrador puede crear otros administradores.' });
            }
        }

        // Verificar si el usuario ya existe
        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'El usuario ya existe' });
        }

        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear usuario
        const newUser = new UserModel({
            name: name,
            email,
            password: hashedPassword,
            role: role || 'user'
        });

        await newUser.save();
        res.status(201).json({ message: 'Usuario registrado con éxito', userId: newUser._id });
    } catch (error) {
        console.error('Error al registrar usuario:', error);
        res.status(500).json({ message: 'Error al registrar usuario', error: error.message });
    }
};

module.exports = {
    getAllUsers,
    deleteUser,
    registerUser
}; 