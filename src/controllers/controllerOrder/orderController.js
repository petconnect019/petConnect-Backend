const orderData = require('../../data/orderData');

const orderController = {
    // Crear una nueva orden
    createOrder: async (req, res) => {
        try {
            const { quantity, shippingDetails, customerName, customerEmail } = req.body;
            const userId = req.user.id;

            // Validar campos obligatorios
            if (!quantity || quantity < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'La cantidad debe ser al menos 1'
                });
            }

            // Validar información del cliente
            if (!customerName || !customerEmail) {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre y email del cliente son obligatorios'
                });
            }

            // Validar formato de email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(customerEmail)) {
                return res.status(400).json({
                    success: false,
                    message: 'El formato del email es inválido'
                });
            }

            const result = await orderData.createOrder({
                userId,
                quantity,
                shippingDetails,
                customerName,
                customerEmail
            });

            res.status(201).json({
                success: true,
                order: result.order,
                clientSecret: result.clientSecret
            });
        } catch (error) {
            console.error('Error al crear orden:', error);
            
            // Determinar el código de estado HTTP apropiado
            let statusCode = 500;
            if (error.message.includes('Usuario no encontrado')) {
                statusCode = 404;
            } else if (error.message.includes('Solicitud inválida')) {
                statusCode = 400;
            }
            
            res.status(statusCode).json({
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
            let { forceConfirm = false } = req.body;
            
            // Restringir forceConfirm solo a entornos de desarrollo
            if (process.env.NODE_ENV === 'production') {
                forceConfirm = false;
            }
            
            const result = await orderData.confirmPayment(orderId, forceConfirm);
            
            res.json({
                success: true,
                order: result.order,
                qrCodes: result.qrCodes
            });
        } catch (error) {
            console.error('Error al confirmar pago:', error);
            
            // Determinar el código de estado HTTP apropiado
            let statusCode = 500;
            if (error.message === 'Orden no encontrada') {
                statusCode = 404;
            } else if (error.message.includes('El pago no ha sido completado')) {
                statusCode = 400;
            } else if (error.message.includes('PaymentIntent no encontrado')) {
                statusCode = 404;
            }
            
            res.status(statusCode).json({
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
            
            // Determinar el código de estado HTTP apropiado
            let statusCode = 500;
            if (error.message === 'Orden no encontrada') {
                statusCode = 404;
            }
            
            res.status(statusCode).json({
                success: false,
                message: 'Error al obtener la orden',
                error: error.message
            });
        }
    }
};

module.exports = orderController; 