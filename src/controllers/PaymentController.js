const Payment = require('../models/Payment');
const Order = require('../models/Order');

class PaymentController {
    async createPayment(req, res) {
        try {
            const { orderId, amount, paymentMethod } = req.body;
            
            // Verificar que la orden existe
            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({ message: 'Orden no encontrada' });
            }

            // Crear el nuevo pago
            const payment = new Payment({
                order: orderId,
                amount,
                paymentMethod,
                status: 'pending',
                userId: req.user.id // Obtenido del middleware de autenticación
            });

            await payment.save();

            res.status(201).json({
                message: 'Pago creado exitosamente',
                payment
            });
        } catch (error) {
            console.error('Error al crear el pago:', error);
            res.status(500).json({ message: 'Error al procesar el pago' });
        }
    }

    async getPaymentsByOrder(req, res) {
        try {
            const { orderId } = req.params;
            
            const payments = await Payment.find({ order: orderId })
                .populate('order')
                .sort({ createdAt: -1 });

            res.json(payments);
        } catch (error) {
            console.error('Error al obtener los pagos:', error);
            res.status(500).json({ message: 'Error al obtener los pagos' });
        }
    }

    async updatePaymentStatus(req, res) {
        try {
            const { paymentId } = req.params;
            const { status } = req.body;

            const validStatus = ['pending', 'completed', 'failed', 'refunded'];
            if (!validStatus.includes(status)) {
                return res.status(400).json({ 
                    message: 'Estado de pago inválido',
                    validStatus
                });
            }

            const payment = await Payment.findById(paymentId);
            if (!payment) {
                return res.status(404).json({ message: 'Pago no encontrado' });
            }

            payment.status = status;
            await payment.save();

            res.json({
                message: 'Estado del pago actualizado exitosamente',
                payment
            });
        } catch (error) {
            console.error('Error al actualizar el estado del pago:', error);
            res.status(500).json({ message: 'Error al actualizar el estado del pago' });
        }
    }
}

module.exports = new PaymentController(); 