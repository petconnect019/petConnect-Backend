const AdminData = require('../../data/adminData');
const UserModel = require('../../models/UserModel');
const bcrypt = require('bcrypt');

const AdminController = {
    getAllUsers: async (req, res) => {
        try {
            const users = await AdminData.getAllUsers();
            res.status(200).json({
                ok: true,
                users
            });
        } catch (error) {
            console.error('Error al obtener usuarios:', error);
            res.status(500).json({ 
                ok: false,
                message: 'Error al obtener usuarios', 
                error: error.message 
            });
        }
    },

    deleteUser: async (req, res) => {
        try {
            const { id } = req.params;
            
            try {
                await AdminData.deleteUser(id);
                res.status(200).json({ 
                    ok: true,
                    message: 'Usuario eliminado con éxito' 
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
            console.error('Error al eliminar usuario:', error);
            res.status(500).json({ 
                ok: false,
                message: 'Error al eliminar usuario', 
                error: error.message 
            });
        }
    },

    registerUser: async (req, res) => {
        try {
            const userData = req.body;
            const currentUserRole = req.user.role;
            
            try {
                const newUser = await AdminData.registerUser(userData, currentUserRole);
                res.status(201).json({ 
                    ok: true,
                    message: 'Usuario registrado con éxito', 
                    userId: newUser._id 
                });
            } catch (error) {
                if (error.message === 'Solo un administrador puede crear otros administradores.') {
                    return res.status(403).json({ 
                        ok: false,
                        message: 'Solo un administrador puede crear otros administradores.' 
                    });
                }
                if (error.message === 'El usuario ya existe') {
                    return res.status(400).json({ 
                        ok: false,
                        message: 'El usuario ya existe' 
                    });
                }
                throw error;
            }
        } catch (error) {
            console.error('Error al registrar usuario:', error);
            res.status(500).json({ 
                ok: false,
                message: 'Error al registrar usuario', 
                error: error.message 
            });
        }
    },

    /**
     * Actualizar un usuario existente
     */
    updateUser: async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const currentUserRole = req.user.role;

            // Validación básica de datos requeridos
            if (!id) {
                return res.status(400).json({
                    ok: false,
                    message: 'ID de usuario es requerido'
                });
            }

            // Validación de datos de actualización
            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({
                    ok: false,
                    message: 'Se requieren datos para actualizar'
                });
            }

            // Delegar la lógica de negocio a AdminData
            const updatedUser = await AdminData.updateUser(id, updateData, currentUserRole);

            res.status(200).json({
                ok: true,
                message: 'Usuario actualizado exitosamente',
                user: updatedUser
            });
        } catch (error) {
            console.error('Error al actualizar usuario:', error);
            
            // Manejar errores específicos
            if (error.message === 'Usuario no encontrado') {
                return res.status(404).json({
                    ok: false,
                    message: error.message
                });
            }
            
            if (error.message === 'Solo un administrador puede asignar el rol de administrador') {
                return res.status(403).json({
                    ok: false,
                    message: error.message
                });
            }

            // Error genérico
            res.status(500).json({
                ok: false,
                message: 'Error al actualizar usuario',
                error: error.message
            });
        }
    },

    /**
     * Cambiar el rol de un usuario
     */
    changeUserRole: async (req, res) => {
        try {
            const { id } = req.params;
            const { role } = req.body;
            const currentUserRole = req.user.role;

            // Validación básica
            if (!id) {
                return res.status(400).json({
                    ok: false,
                    message: 'ID de usuario es requerido'
                });
            }

            if (!role) {
                return res.status(400).json({
                    ok: false,
                    message: 'El nuevo rol es requerido'
                });
            }

            // Delegar la lógica de negocio a AdminData
            const updatedUser = await AdminData.changeUserRole(id, role, currentUserRole);

            res.status(200).json({
                ok: true,
                message: 'Rol de usuario actualizado exitosamente',
                user: updatedUser
            });
        } catch (error) {
            console.error('Error al cambiar rol de usuario:', error);
            
            // Manejar errores específicos
            if (error.message === 'Usuario no encontrado') {
                return res.status(404).json({
                    ok: false,
                    message: error.message
                });
            }
            
            if (error.message === 'Solo un administrador puede cambiar roles de usuario' ||
                error.message === 'No se puede quitar el rol de administrador al último administrador del sistema') {
                return res.status(403).json({
                    ok: false,
                    message: error.message
                });
            }

            if (error.message === 'Rol inválido. Los roles válidos son: user, admin') {
                return res.status(400).json({
                    ok: false,
                    message: error.message
                });
            }

            // Error genérico
            res.status(500).json({
                ok: false,
                message: 'Error al cambiar rol de usuario',
                error: error.message
            });
        }
    },

    /**
     * Obtener estadísticas de usuarios
     */
    getUserStats: async (req, res) => {
        try {
            // Verificar permisos de administrador
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    ok: false,
                    message: 'No tienes permiso para acceder a estas estadísticas'
                });
            }

            // Delegar la lógica de negocio a AdminData
            const stats = await AdminData.getUserStats();

            res.status(200).json({
                ok: true,
                stats
            });
        } catch (error) {
            console.error('Error al obtener estadísticas de usuarios:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al obtener estadísticas de usuarios',
                error: error.message
            });
        }
    }
};

module.exports = AdminController; 