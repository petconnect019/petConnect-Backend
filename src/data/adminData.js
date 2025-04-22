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
    },

    /**
     * Actualiza un usuario existente
     * @param {string} id - ID del usuario a actualizar
     * @param {Object} updateData - Datos a actualizar
     * @param {string} currentUserRole - Rol del usuario actual
     * @returns {Object} Usuario actualizado
     */
    updateUser: async (id, updateData, currentUserRole) => {
        try {
            // Verificar si el usuario existe
            const existingUser = await UserModel.findById(id);
            if (!existingUser) {
                throw new Error('Usuario no encontrado');
            }

            // Si se está actualizando el rol a admin, verificar permisos
            if (updateData.role === 'admin' && currentUserRole !== 'admin') {
                throw new Error('Solo un administrador puede asignar el rol de administrador');
            }

            // Si se está actualizando la contraseña, encriptarla
            if (updateData.password) {
                const salt = await bcrypt.genSalt(10);
                updateData.password = await bcrypt.hash(updateData.password, salt);
            }

            // Actualizar el usuario
            const updatedUser = await UserModel.findByIdAndUpdate(
                id,
                { $set: updateData },
                { new: true, runValidators: true }
            ).select('-password');

            return updatedUser;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Cambia el rol de un usuario
     * @param {string} id - ID del usuario a actualizar
     * @param {string} newRole - Nuevo rol a asignar
     * @param {string} currentUserRole - Rol del usuario actual
     * @returns {Object} Usuario actualizado
     */
    changeUserRole: async (id, newRole, currentUserRole) => {
        try {
            // Verificar que el usuario actual sea administrador
            if (currentUserRole !== 'admin') {
                throw new Error('Solo un administrador puede cambiar roles de usuario');
            }

            // Verificar que el nuevo rol sea válido
            if (!['user', 'admin'].includes(newRole)) {
                throw new Error('Rol inválido. Los roles válidos son: user, admin');
            }

            // Verificar si el usuario existe
            const user = await UserModel.findById(id);
            if (!user) {
                throw new Error('Usuario no encontrado');
            }

            // Verificar que no se esté cambiando el rol del último administrador
            if (user.role === 'admin' && newRole === 'user') {
                const adminCount = await UserModel.countDocuments({ role: 'admin' });
                if (adminCount <= 1) {
                    throw new Error('No se puede quitar el rol de administrador al último administrador del sistema');
                }
            }

            // Actualizar el rol del usuario
            const updatedUser = await UserModel.findByIdAndUpdate(
                id,
                { role: newRole },
                { new: true, runValidators: true }
            ).select('-password');

            return updatedUser;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Obtiene estadísticas de usuarios
     * @returns {Object} Estadísticas de usuarios
     */
    getUserStats: async () => {
        try {
            // Obtener total de usuarios
            const totalUsers = await UserModel.countDocuments();

            // Obtener usuarios por rol
            const usersByRole = await UserModel.aggregate([
                {
                    $group: {
                        _id: "$role",
                        count: { $sum: 1 }
                    }
                }
            ]);

            // Obtener usuarios por estado (activo/inactivo)
            const usersByStatus = await UserModel.aggregate([
                {
                    $group: {
                        _id: "$is_active",
                        count: { $sum: 1 }
                    }
                }
            ]);

            // Obtener usuarios por género
            const usersByGender = await UserModel.aggregate([
                {
                    $group: {
                        _id: "$gender",
                        count: { $sum: 1 }
                    }
                }
            ]);

            // Obtener usuarios por país
            const usersByCountry = await UserModel.aggregate([
                {
                    $group: {
                        _id: "$country",
                        count: { $sum: 1 }
                    }
                }
            ]);

            // Obtener usuarios por mes de registro
            const usersByMonth = await UserModel.aggregate([
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" }
                        },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: {
                        "_id.year": 1,
                        "_id.month": 1
                    }
                }
            ]);

            // Obtener usuarios con perfil público
            const publicProfiles = await UserModel.countDocuments({ is_profile_public: true });

            // Obtener usuarios que muestran contacto
            const showContact = await UserModel.countDocuments({ show_contact: true });

            return {
                totalUsers,
                usersByRole: usersByRole.reduce((acc, curr) => {
                    acc[curr._id] = curr.count;
                    return acc;
                }, {}),
                usersByStatus: usersByStatus.reduce((acc, curr) => {
                    acc[curr._id ? 'active' : 'inactive'] = curr.count;
                    return acc;
                }, {}),
                usersByGender: usersByGender.reduce((acc, curr) => {
                    acc[curr._id] = curr.count;
                    return acc;
                }, {}),
                usersByCountry: usersByCountry.reduce((acc, curr) => {
                    acc[curr._id] = curr.count;
                    return acc;
                }, {}),
                usersByMonth: usersByMonth.map(item => ({
                    year: item._id.year,
                    month: item._id.month,
                    count: item.count
                })),
                publicProfiles,
                showContact
            };
        } catch (error) {
            throw error;
        }
    }
};

module.exports = AdminData;
