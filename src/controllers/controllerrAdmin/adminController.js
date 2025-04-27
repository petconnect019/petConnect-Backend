const AdminData = require('../../data/adminData');
const UserModel = require('../../models/UserModel');
const bcrypt = require('bcrypt');

const AdminController = {
    getAllUsers: async (req, res, next) => {
        try {
            const users = await AdminData.getAllUsers();
            res.status(200).json({
                ok: true,
                users
            });
        } catch (error) {
            console.error('Error al obtener usuarios:', error);
            next(error);
        }
    },

    deleteUser: async (req, res, next) => {
        try {
            const { id } = req.params;
            
            const result = await AdminData.deleteUser(id);
            if (!result) {
                const error = new Error('Usuario no encontrado');
                error.statusCode = 404;
                return next(error);
            }
            
            res.status(200).json({ 
                ok: true,
                message: 'Usuario eliminado con éxito' 
            });
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            next(error);
        }
    },

    registerUser: async (req, res, next) => {
        try {
            const userData = req.body;
            const currentUserRole = req.user.role;
            
            if (userData.role === 'admin' && currentUserRole !== 'admin') {
                const error = new Error('Solo un administrador puede crear otros administradores.');
                error.statusCode = 403;
                return next(error);
            }

            const newUser = await AdminData.registerUser(userData, currentUserRole);
            res.status(201).json({ 
                ok: true,
                message: 'Usuario registrado con éxito', 
                userId: newUser._id 
            });
        } catch (error) {
            console.error('Error al registrar usuario:', error);
            if (error.message === 'El usuario ya existe') {
                error.statusCode = 400;
            }
            next(error);
        }
    },

    /**
     * Actualizar un usuario existente
     */
    updateUser: async (req, res, next) => {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const currentUserRole = req.user.role;

            // Validación básica de datos requeridos
            if (!id) {
                const error = new Error('ID de usuario es requerido');
                error.statusCode = 400;
                return next(error);
            }

            // Validación de datos de actualización
            if (Object.keys(updateData).length === 0) {
                const error = new Error('Se requieren datos para actualizar');
                error.statusCode = 400;
                return next(error);
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
            
            if (error.message === 'Usuario no encontrado') {
                error.statusCode = 404;
            } else if (error.message === 'Solo un administrador puede asignar el rol de administrador') {
                error.statusCode = 403;
            }
            
            next(error);
        }
    },

    /**
     * Cambiar el rol de un usuario
     */
    changeUserRole: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { role } = req.body;
            const currentUserRole = req.user.role;

            // Validación básica
            if (!id) {
                const error = new Error('ID de usuario es requerido');
                error.statusCode = 400;
                return next(error);
            }

            if (!role) {
                const error = new Error('El nuevo rol es requerido');
                error.statusCode = 400;
                return next(error);
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
            
            if (error.message === 'Usuario no encontrado') {
                error.statusCode = 404;
            } else if (error.message === 'Solo un administrador puede cambiar roles de usuario' ||
                      error.message === 'No se puede quitar el rol de administrador al último administrador del sistema') {
                error.statusCode = 403;
            } else if (error.message === 'Rol inválido. Los roles válidos son: user, admin') {
                error.statusCode = 400;
            }
            
            next(error);
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
    },

    /**
     * Confirma una orden y genera QRs asociados (solo admin)
     * @param {Object} req - Objeto de solicitud
     * @param {Object} res - Objeto de respuesta
     */
    confirmOrderAndGenerateQR: async (req, res) => {
        try {
            const { orderId } = req.params;
            const { epaycoRef } = req.body;
            
            console.log(`Admin confirma orden ${orderId} con referencia de Epayco: ${epaycoRef || 'N/A'}`);
            
            // Verificar que la orden existe
            const orderData = require('../../data/orderData');
            const order = await orderData.getOrderById(orderId);
            
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Orden no encontrada'
                });
            }
            
            // Si se proporciona una referencia de ePayco, actualizar la orden
            if (epaycoRef) {
                await orderData.updateOrderPayment(orderId, {
                    epaycoRef,
                    paymentStatus: 'COMPLETED',
                    paymentData: {
                        transactionId: epaycoRef,
                        approvalCode: 'ADMIN_APPROVED',
                        amount: order.totalAmount,
                        transactionDate: new Date(),
                        responseCode: '1',
                        paymentMethod: 'Admin Manual',
                    }
                });
            }
            
            // Confirmar la orden y generar QRs
            const result = await orderData.confirmOrder(orderId);
            
            return res.status(200).json({
                success: true,
                message: 'Orden confirmada y QRs generados exitosamente',
                order: result.order,
                qrCodes: result.qrCodes
            });
        } catch (error) {
            console.error('Error al confirmar orden desde admin:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al confirmar la orden',
                error: error.message
            });
        }
    },

    // Obtener estadísticas del sistema
    getSystemStats: async (req, res, next) => {
        try {
            const stats = await AdminData.getSystemStats();
            res.status(200).json({
                ok: true,
                stats
            });
        } catch (error) {
            console.error('Error al obtener estadísticas del sistema:', error);
            next(error);
        }
    },

    // Obtener logs del sistema
    getSystemLogs: async (req, res, next) => {
        try {
            const { page = 1, limit = 50, level } = req.query;
            
            if (page < 1 || limit < 1) {
                const error = new Error('Parámetros de paginación inválidos');
                error.statusCode = 400;
                return next(error);
            }

            const logs = await AdminData.getSystemLogs(page, limit, level);
            res.status(200).json({
                ok: true,
                logs
            });
        } catch (error) {
            console.error('Error al obtener logs del sistema:', error);
            next(error);
        }
    },

    // Limpiar logs antiguos
    cleanOldLogs: async (req, res, next) => {
        try {
            const { days } = req.body;

            if (!days || days < 1) {
                const error = new Error('Se requiere especificar un número válido de días');
                error.statusCode = 400;
                return next(error);
            }

            const result = await AdminData.cleanOldLogs(days);
            res.status(200).json({
                ok: true,
                message: `Se eliminaron ${result.deletedCount} logs antiguos`,
                result
            });
        } catch (error) {
            console.error('Error al limpiar logs antiguos:', error);
            next(error);
        }
    }
};

module.exports = AdminController; 