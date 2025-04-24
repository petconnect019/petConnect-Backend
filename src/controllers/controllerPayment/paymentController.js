const paymentData = require('../../data/paymentData');
const { Payment, Order } = require('../../models');

class PaymentController {
    // Crear un nuevo pago
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

    // Obtener pagos por orden
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

    // Actualizar estado del pago
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

    // Endpoint para manejar la confirmación del pago de ePayco
    async handlePaymentConfirmation(req, res) {
        try {
            const result = await this.processPaymentConfirmation(req.body);
            res.status(200).json(result);
        } catch (error) {
            console.error('Error al procesar confirmación de pago:', error);
            res.status(200).json({
                success: false,
                error: error.message
            });
        }
    }
    
    // Endpoint para recibir al usuario después del pago
    async paymentResponse(req, res) {
        try {
            const frontendUrl = process.env.FRONTEND_URL;
            const result = paymentData.processPaymentResponse(req.query);
            res.redirect(`${frontendUrl}${result.redirectUrl}?${result.queryParams}`);
        } catch (error) {
            console.error('Error en respuesta de pago:', error);
            const frontendUrl = process.env.FRONTEND_URL;
            res.redirect(`${frontendUrl}/payment/error?message=${encodeURIComponent('Error al procesar la respuesta del pago')}`);
        }
    }

    // Procesar la confirmación del pago
    async processPaymentConfirmation(paymentInfo) {
        try {
            console.log('Procesando confirmación de pago:', {
                ref: paymentInfo.x_ref_payco,
                transactionId: paymentInfo.x_transaction_id,
                orderId: paymentInfo.x_extra1,
                status: paymentInfo.x_transaction_state
            });

            // Validar que tengamos la información necesaria
            if (!paymentInfo.x_ref_payco || !paymentInfo.x_transaction_id || !paymentInfo.x_extra1) {
                throw new Error('Información de pago incompleta');
            }

            // Buscar el pago existente
            const payment = await Payment.findOne({
                transactionId: paymentInfo.x_ref_payco
            });

            if (!payment) {
                throw new Error(`Pago no encontrado con referencia: ${paymentInfo.x_ref_payco}`);
            }

            // Mapear el estado de ePayco a nuestro estado interno
            const paymentStatus = this.mapEpaycoStatus(paymentInfo.x_transaction_state);
            
            // Actualizar el pago
            payment.status = paymentStatus;
            payment.paymentDetails = {
                ...payment.paymentDetails,
                epaycoResponse: paymentInfo,
                processedAt: new Date()
            };
            await payment.save();

            // Si el pago fue exitoso, actualizar la orden
            if (paymentStatus === 'completed') {
                const order = await Order.findById(paymentInfo.x_extra1);
                if (order) {
                    order.status = 'COMPLETED';
                    await order.save();
                }
            }

            return {
                success: true,
                payment_id: payment._id,
                status: paymentStatus
            };
        } catch (error) {
            console.error('Error procesando confirmación de pago:', error);
            throw error;
        }
    }

    // Mapear estados de ePayco a nuestros estados internos
    mapEpaycoStatus(epaycoStatus) {
        const statusMap = {
            'Aceptada': 'completed',
            'Pendiente': 'pending',
            'Rechazada': 'failed',
            'Fallida': 'failed',
            'Expirada': 'failed'
        };
        return statusMap[epaycoStatus] || 'failed';
    }
}

module.exports = new PaymentController(); 