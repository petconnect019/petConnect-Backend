const orderData = require('../../data/orderData');

class OrderController {
    async createOrder(req, res) {
        try {
            console.log('Iniciando creación de orden con datos:', JSON.stringify(req.body, null, 2));
            const result = await orderData.createOrder(req.body, req.user.id);
            
            res.status(201).json({
                success: true,
                ...result
            });
        } catch (error) {
            console.error('Error al crear orden:', error);
            res.status(error.message.includes('requerido') ? 400 : 500).json({
                success: false,
                error: error.message
            });
        }
    }

    async confirmPayment(req, res) {
        try {
            console.log('Datos de confirmación recibidos:', req.body);
            const result = await orderData.confirmPayment(req.body);
            
            res.status(200).json({
                success: true,
                ...result
            });
        } catch (error) {
            console.error('Error al confirmar pago:', error);
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
