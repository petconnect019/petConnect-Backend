const orderData = require('../../data/orderData');

class PaymentController {
    // Webhook para recibir notificaciones de ePayco
    async confirmPayment(req, res) {
        try {
            console.log('Recibida confirmación de pago de ePayco:', JSON.stringify(req.body, null, 2));
            
            // Obtener datos del pago
            const { 
                ref_payco,    // Referencia de pago de ePayco
                x_ref_payco,  // Alternativa para la referencia
                x_transaction_state, // Estado de la transacción
                x_id_invoice, // ID de la factura (orderId)
                x_amount,     // Monto pagado
                x_response    // Respuesta del pago
            } = req.body;
            
            // Obtener la referencia del pago
            const referencia = ref_payco || x_ref_payco;
            if (!referencia) {
                throw new Error('Referencia de pago no proporcionada');
            }
            
            // Obtener ID de la orden (puede estar en diferentes campos según la configuración)
            const orderId = req.body.extra1 || x_id_invoice;
            if (!orderId) {
                throw new Error('ID de orden no proporcionado');
            }
            
            // Verificar el estado del pago
            const estadoPago = x_transaction_state;
            if (!estadoPago) {
                throw new Error('Estado de transacción no proporcionado');
            }
            
            console.log(`Procesando pago para orden ${orderId} con referencia ${referencia} y estado ${estadoPago}`);
            
            // Si el pago es exitoso, confirmar la orden
            if (estadoPago === 'Aceptada' || estadoPago === '1' || x_response === 'Aceptada') {
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
            console.error('Error al procesar confirmación de pago:', error);
            // Siempre responder con 200 OK a ePayco, incluso en caso de error
            return res.status(200).send('OK');
        }
    }
    
    // Endpoint para recibir al usuario después del pago
    async paymentResponse(req, res) {
        try {
            // Aquí se puede redirigir al usuario a una página de éxito/error
            const referencia = req.query.ref_payco || '';
            
            // Redirigir a una página de resumen o éxito
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5175';
            res.redirect(`${frontendUrl}/payment/success?ref_payco=${referencia}`);
        } catch (error) {
            console.error('Error en respuesta de pago:', error);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5175';
            res.redirect(`${frontendUrl}/payment/error`);
        }
    }
}

module.exports = new PaymentController(); 