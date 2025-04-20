const OrderModel = require('../../models/OrderModel');
const EpaycoService = require('../../services/epaycoService');

class PaymentController {
    async handlePaymentConfirmation(req, res) {
        try {
            const { x_ref_payco, x_cod_response, x_transaction_id, x_extra1 } = req.body;
            
            // Obtener información del pago
            const paymentInfo = await EpaycoService.getPaymentInfo(x_ref_payco);
            
            // Buscar la orden
            const order = await OrderModel.findById(x_extra1);
            if (!order) {
                throw new Error('Orden no encontrada');
            }

            // Actualizar estado de la orden según la respuesta
            if (x_cod_response === 1) { // Pago exitoso
                await OrderModel.findByIdAndUpdate(order._id, {
                    status: 'COMPLETED',
                    paymentStatus: 'COMPLETED',
                    transactionId: x_transaction_id
                });
            } else {
                await OrderModel.findByIdAndUpdate(order._id, {
                    status: 'FAILED',
                    paymentStatus: 'FAILED',
                    transactionId: x_transaction_id
                });
            }

            res.status(200).json({ success: true });
        } catch (error) {
            console.error('Error al procesar confirmación de pago:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    }
}

module.exports = new PaymentController(); 