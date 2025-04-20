const orderData = require('../../data/orderData');
const EpaycoService = require('../../services/epaycoService');

class OrderController {
    async createOrder(req, res) {
        try {
            console.log('Iniciando creación de orden con datos:', JSON.stringify(req.body, null, 2));
            
            // Reestructurar los datos del cliente si vienen en un objeto customer
            const orderInfo = {
                ...req.body,
                customerName: req.body.customer?.name || req.body.customerName,
                customerLastName: req.body.customer?.lastName || req.body.customerLastName,
                customerEmail: req.body.customer?.email || req.body.customerEmail,
                docNumber: req.body.customer?.docNumber || req.body.docNumber,
                status: 'pending'
            };
            
            // Crear la orden
            const order = await orderData.createOrder(orderInfo, req.user.id);
            
            res.status(201).json({
                success: true,
                order
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
            const { paymentData } = req.body;

            // Validar que exista el token de pago
            if (!paymentData?.token) {
                throw new Error('Token de pago es requerido');
            }

            // Obtener la orden
            const order = await orderData.getOrderById(orderId);
            
            if (!order) {
                throw new Error('Orden no encontrada');
            }

            if (order.status !== 'pending') {
                throw new Error('La orden ya ha sido procesada');
            }

            // Preparar datos para ePayco
            const paymentInfo = {
                ...order,
                paymentData,
                ip: req.ip
            };

            // Procesar el pago con ePayco
            const payment = await EpaycoService.createPayment(paymentInfo);

            // Si el pago es exitoso, actualizar la orden y generar códigos QR
            if (payment.success) {
                const result = await orderData.confirmOrder(orderId);
                
                res.status(200).json({
                    success: true,
                    order: result.order,
                    payment,
                    qrCodes: result.qrCodes
                });
            } else {
                throw new Error('Error al procesar el pago');
            }
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
