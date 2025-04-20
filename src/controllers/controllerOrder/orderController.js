const orderData = require('../../data/orderData');
const EpaycoService = require('../../services/epaycoService');

class OrderController {
    async createOrder(req, res) {
        try {
            console.log('Iniciando creación de orden con datos:', JSON.stringify(req.body, null, 2));
            
            // Crear la orden primero
            const order = await orderData.createOrder(req.body, req.user.id);
            
            // Preparar datos para ePayco
            const paymentData = {
                ...req.body,
                orderId: order._id,
                userId: req.user.id,
                ip: req.ip
            };

            // Crear el pago en ePayco
            const payment = await EpaycoService.createPayment(paymentData);
            
            res.status(201).json({
                success: true,
                order,
                payment
            });
        } catch (error) {
            console.error('Error al crear orden:', error);
            res.status(error.message.includes('requerido') ? 400 : 500).json({
                success: false,
                error: error.message
            });
        }
    }

    async confirmOrder(req, res) {
        try {
            const orderId = req.params.orderId;
            console.log('Confirmando orden:', orderId);
            const result = await orderData.confirmOrder(orderId);
            
            res.status(200).json({
                success: true,
                ...result
            });
        } catch (error) {
            console.error('Error al confirmar orden:', error);
            res.status(error.message.includes('no encontrada') ? 404 : 500).json({
                success: false,
                error: error.message
            });
        }
    }

    async getOrderById(req, res) {
        try {
            const order = await orderData.getOrderById(req.params.orderId);
            res.status(200).json({ 
                success: true, 
                order 
            });
        } catch (error) {
            res.status(error.message.includes('no encontrada') ? 404 : 500).json({ 
                success: false, 
                error: error.message 
            });
        }
    }

    async getUserOrders(req, res) {
        try {
            const orders = await orderData.getUserOrders(req.user.id);
            res.status(200).json({ 
                success: true, 
                orders 
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    }
}

module.exports = new OrderController();
