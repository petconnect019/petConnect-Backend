const orderData = require('../../data/orderData');
const EpaycoService = require('../../services/epaycoService');

class PaymentController {
    async handlePaymentConfirmation(req, res) {
        try {
            const { x_ref_payco, x_cod_response, x_response } = req.body;

            // Verificar el estado del pago
            const paymentInfo = await EpaycoService.getPaymentInfo(x_ref_payco);
            
            if (!paymentInfo.success) {
                throw new Error('Pago no encontrado');
            }

            // Obtener el ID de la orden desde los extras
            const orderId = paymentInfo.data.extras?.extra1;
            if (!orderId) {
                throw new Error('ID de orden no encontrado en el pago');
            }

            // Obtener la orden
            const order = await orderData.getOrderById(orderId);
            if (!order) {
                throw new Error('Orden no encontrada');
            }

            // Si el pago es exitoso y la orden está pendiente, confirmarla
            if (paymentInfo.status === 'approved' && order.status === 'pending') {
                const result = await orderData.confirmOrder(orderId);
                
                res.status(200).json({
                    success: true,
                    message: 'Pago confirmado y orden completada',
                    order: result.order,
                    qrCodes: result.qrCodes
                });
            } else {
                res.status(200).json({
                    success: true,
                    message: 'Pago ya procesado anteriormente',
                    order
                });
            }
        } catch (error) {
            console.error('Error al procesar confirmación de pago:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async verifyPayment(req, res) {
        try {
            const { paymentId } = req.params;
            const isVerified = await EpaycoService.verifyPayment(paymentId);
            
            res.status(200).json({
                success: true,
                verified: isVerified
            });
        } catch (error) {
            console.error('Error al verificar pago:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new PaymentController(); 