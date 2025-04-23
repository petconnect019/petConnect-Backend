const paymentData = require('../../data/paymentData');
const orderData = require('../../data/orderData');

class PaymentController {
    // Endpoint para recibir al usuario después del pago
    async paymentResponse(req, res) {
        try {
            const frontendUrl = process.env.FRONTEND_URL;
            
            // Procesar la respuesta del pago
            const result = paymentData.processPaymentResponse(req.query);
            
            // Redirigir al usuario
            res.redirect(`${frontendUrl}${result.redirectUrl}?${result.queryParams}`);
        } catch (error) {
            console.error('Error en respuesta de pago:', error);
            const frontendUrl = process.env.FRONTEND_URL;
            res.redirect(`${frontendUrl}/payment/error?message=${encodeURIComponent('Error al procesar la respuesta del pago')}`);
        }
    }

    // Webhook para recibir notificaciones de ePayco
    async confirmPayment(req, res) {
        let orderId;
        try {
            console.log('Recibida confirmación de pago de ePayco:', JSON.stringify(req.query, null, 2));

            // Obtener datos del pago
            const {
                x_ref_payco, // Referencia de pago
                x_transaction_state, // Estado de la transacción
                x_response, // Respuesta del pago (Aceptada, Rechazada, etc.)
                x_approval_code, // Código de aprobación
                x_id_invoice, // ID de la factura
                x_amount, // Monto pagado
                x_extra1, // Campo extra donde enviamos el orderId
                x_cod_transaction_state // Código del estado de la transacción
            } = req.query;

            // Obtener la referencia del pago
            const referencia = x_ref_payco;
            if (!referencia) {
                throw new Error('Referencia de pago no proporcionada');
            }

            // Obtener ID de la orden
            orderId = x_extra1 || x_id_invoice;
            if (!orderId) {
                throw new Error('ID de orden no proporcionado');
            }

            // Determinar el estado del pago
            const estadoPago = x_transaction_state || x_response;
            console.log(`Procesando pago para orden ${orderId} con referencia ${referencia} y estado ${estadoPago}`);

            // Si el pago es exitoso, confirmar la orden
            if (estadoPago === 'Aceptada' || estadoPago === '1' || x_response === 'Aceptada') {
                // Actualizar la orden con los datos de pago de ePayco antes de confirmarla
                await orderData.updateOrderPayment(orderId, {
                    epaycoRef: referencia,
                    paymentStatus: 'COMPLETED',
                    paymentData: {
                        transactionId: referencia,
                        approvalCode: x_approval_code,
                        amount: x_amount,
                        transactionDate: new Date(),
                        responseCode: x_response,
                        paymentMethod: req.query.x_franchise || 'N/A',
                        last4: req.query.x_cardnumber ? req.query.x_cardnumber.slice(-4) : 'N/A'
                    }
                });

                console.log(`Información de pago actualizada para orden ${orderId}`);

                // Confirmar la orden y generar QRs
                const result = await orderData.confirmOrder(orderId);

                console.log(`Orden ${orderId} confirmada exitosamente a través de webhook ePayco`);

                // Responder a ePayco
                return res.status(200).send('OK');
            } else {
                console.log(`Pago rechazado o pendiente para la orden ${orderId}: ${estadoPago}`);
                return res.status(200).send('OK'); // Siempre responder 200 a ePayco
            }
        } catch (error) {
            console.error(`Error al confirmar la orden ${orderId || 'desconocida'}:`, error);
            return res.status(200).send('OK'); // Siempre responder 200 a ePayco
        }
    }
}

module.exports = new PaymentController(); 