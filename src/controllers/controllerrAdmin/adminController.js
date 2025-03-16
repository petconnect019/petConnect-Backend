const AdminData = require('../../data/adminData');

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
    }
};

module.exports = AdminController; 