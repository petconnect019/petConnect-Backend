const paymentData = require('../../data/paymentData');
const Payment = require('../../models/Payment');
const Order = require('../../models/OrderModel');

class PaymentController {
    // Crear un nuevo pago
    async createPayment(req, res, next) {
        try {
            const { orderId, amount, paymentMethod } = req.body;
            
            // Verificar que la orden existe
            const order = await Order.findById(orderId);
            if (!order) {
                const error = new Error('Orden no encontrada');
                error.statusCode = 404;
                return next(error);
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
            next(error);
        }
    }

    // Obtener pagos por orden
    async getPaymentByOrderId(req, res, next) {
        try {
            const { orderId } = req.params;
            
            const payments = await Payment.find({ order: orderId })
                .populate('order')
                .sort({ createdAt: -1 });

            res.json(payments);
        } catch (error) {
            console.error('Error al obtener los pagos:', error);
            next(error);
        }
    }

    // Actualizar estado del pago
    async updatePaymentStatus(req, res, next) {
        try {
            const { paymentId } = req.params;
            const { status } = req.body;

            const validStatus = ['pending', 'completed', 'failed', 'refunded'];
            if (!validStatus.includes(status)) {
                const error = new Error('Estado de pago inválido');
                error.statusCode = 400;
                return next(error);
            }

            const payment = await Payment.findById(paymentId);
            if (!payment) {
                const error = new Error('Pago no encontrado');
                error.statusCode = 404;
                return next(error);
            }

            payment.status = status;
            await payment.save();

            res.json({
                message: 'Estado del pago actualizado exitosamente',
                payment
            });
        } catch (error) {
            console.error('Error al actualizar el estado del pago:', error);
            next(error);
        }
    }

    // Endpoint para manejar la confirmación del pago de ePayco
    async handlePaymentConfirmation(req, res, next) {
        try {
            const result = await this.processPaymentConfirmation(req.body);
            res.status(200).json(result);
        } catch (error) {
            console.error('Error al procesar confirmación de pago:', error);
            error.statusCode = 400;
            next(error);
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
                const error = new Error('Información de pago incompleta');
                error.statusCode = 400;
                throw error;
            }

            // Buscar el pago existente
            const payment = await Payment.findOne({
                transactionId: paymentInfo.x_ref_payco
            });

            if (!payment) {
                const error = new Error(`Pago no encontrado con referencia: ${paymentInfo.x_ref_payco}`);
                error.statusCode = 404;
                throw error;
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