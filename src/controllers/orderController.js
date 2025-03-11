const orderData = require('../data/orderData');

const orderController = {
    // Crear una nueva orden
    createOrder: async (req, res) => {
        try {
            const { quantity, shippingDetails } = req.body;
            const userId = req.user.id;

            if (!quantity || quantity < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'La cantidad debe ser al menos 1'
                });
            }

            const result = await orderData.createOrder({
                userId,
                quantity,
                shippingDetails
            });

            res.status(201).json({
                success: true,
                order: result.order,
                clientSecret: result.clientSecret
            });
        } catch (error) {
            console.error('Error al crear orden:', error);
            res.status(500).json({
                success: false,
                message: 'Error al crear la orden',
                error: error.message
            });
        }
    },

    // Confirmar pago de orden
    confirmPayment: async (req, res) => {
        try {
            const { orderId } = req.params;
            
            const result = await orderData.confirmPayment(orderId);
            
            res.json({
                success: true,
                order: result.order,
                qrCodes: result.qrCodes
            });
        } catch (error) {
            console.error('Error al confirmar pago:', error);
            
            if (error.message === 'Orden no encontrada') {
                return res.status(404).json({
                    success: false,
                    message: 'Orden no encontrada'
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Error al confirmar el pago',
                error: error.message
            });
        }
    },

    // Obtener órdenes del usuario
    getUserOrders: async (req, res) => {
        try {
            const userId = req.user.id;
            const orders = await orderData.getUserOrders(userId);

            res.json({
                success: true,
                orders
            });
        } catch (error) {
            console.error('Error al obtener órdenes:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener las órdenes',
                error: error.message
            });
        }
    },

    // Obtener una orden específica
    getOrderById: async (req, res) => {
        try {
            const { orderId } = req.params;
            const userId = req.user.id;
            const userRole = req.user.role;
            
            // Verificar si el usuario tiene permiso para ver esta orden
            const hasPermission = await orderData.hasPermissionForOrder(orderId, userId, userRole);
            
            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para ver esta orden'
                });
            }
            
            const order = await orderData.getOrderById(orderId);
            
            res.json({
                success: true,
                order
            });
        } catch (error) {
            console.error('Error al obtener orden:', error);
            
            if (error.message === 'Orden no encontrada') {
                return res.status(404).json({
                    success: false,
                    message: 'Orden no encontrada'
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Error al obtener la orden',
                error: error.message
            });
        }
    }
};

module.exports = orderController; 