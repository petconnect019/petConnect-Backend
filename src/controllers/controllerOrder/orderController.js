const orderData = require('../../data/orderData');
const EpaycoService = require('../../services/epaycoService');

class OrderController {
    async createOrder(req, res, next) {
        try {
            console.log('Iniciando creación de orden con datos:', JSON.stringify(req.body, null, 2));
            
            // Validar que el usuario esté autenticado
            if (!req.user || !req.user.id) {
                const error = new Error('Usuario no autenticado');
                error.statusCode = 401;
                return next(error);
            }

            const userId = (req.user._id || req.user.id).toString();
            const orderInfo = {
                ...req.body,
                userId
            };
            
            const order = await orderData.createOrder(orderInfo);
            
            console.log('Orden creada exitosamente:', order._id);
            
            res.status(201).json({
                success: true,
                order
            });
        } catch (error) {
            console.error('Error al crear orden:', error);
            error.statusCode = error.statusCode || 400;
            next(error);
        }
    }

    async confirmOrder(req, res, next) {
        try {
            const orderId = req.params.orderId;
            const { paymentData } = req.body;

            console.log(`Confirmando orden ${orderId} con datos de pago:`, JSON.stringify(paymentData, null, 2));

            // Validar datos de pago
            orderData.validatePaymentData(paymentData);

            // Obtener la orden
            const order = await orderData.getOrderById(orderId);
            
            if (!order) {
                const error = new Error('Orden no encontrada');
                error.statusCode = 404;
                return next(error);
            }

            orderData.validateOrderStatus(order);

            // Procesar el pago con ePayco
            const payment = await EpaycoService.createPayment({
                ...order,
                paymentData,
                ip: req.ip
            });

            if (payment.success) {
                const result = await orderData.confirmOrder(orderId);
                
                console.log(`Orden ${orderId} confirmada exitosamente`);
                
                res.status(200).json({
                    success: true,
                    order: result.order,
                    payment,
                    qrCodes: result.qrCodes
                });
            } else {
                const error = new Error('Error al procesar el pago');
                error.statusCode = 400;
                return next(error);
            }
        } catch (error) {
            console.error('Error al confirmar orden:', error);
            error.statusCode = error.statusCode || 400;
            next(error);
        }
    }

    async getOrderById(req, res, next) {
        try {
            const order = await orderData.getOrderById(req.params.orderId);
            
            if (!order) {
                const error = new Error('Orden no encontrada');
                error.statusCode = 404;
                return next(error);
            }

            // Verificar acceso
            orderData.validateOrderAccess(order, req.user.id);

            console.log(`Orden ${req.params.orderId} obtenida exitosamente`);
            
            res.status(200).json({ 
                success: true, 
                order 
            });
        } catch (error) {
            console.error('Error al obtener orden:', error);
            error.statusCode = error.statusCode || 400;
            next(error);
        }
    }

    async getUserOrders(req, res, next) {
        try {
            const orders = await orderData.getUserOrders(req.user.id);
            console.log(`Obtenidas ${orders.length} órdenes para el usuario ${req.user.id}`);
            
            res.status(200).json({ 
                success: true, 
                orders 
            });
        } catch (error) {
            console.error('Error al obtener órdenes del usuario:', error);
            error.statusCode = error.statusCode || 400;
            next(error);
        }
    }

    /**
     * Redirige al usuario a la factura de ePayco
     */
    async downloadInvoice(req, res, next) {
        try {
            const { orderId } = req.params;
            const userId = req.user.id;

            const order = await orderData.getOrderById(orderId);
            
            if (!order) {
                const error = new Error('Orden no encontrada');
                error.statusCode = 404;
                return next(error);
            }

            orderData.validateOrderAccess(order, userId);

            const invoiceUrl = await EpaycoService.getInvoiceUrl(order.epaycoTransactionId);
            
            if (!invoiceUrl) {
                const error = new Error('No se pudo obtener la factura');
                error.statusCode = 404;
                return next(error);
            }

            res.redirect(invoiceUrl);
        } catch (error) {
            console.error('Error al descargar factura:', error);
            error.statusCode = error.statusCode || 400;
            next(error);
        }
    }
}

module.exports = new OrderController();
