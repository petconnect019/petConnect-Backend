const paymentData = require('../../data/paymentData');

class PaymentController {
    // Webhook para recibir notificaciones de ePayco
    async confirmPayment(req, res) {
        try {
            console.log('Recibida confirmación de pago de ePayco:', JSON.stringify(req.query, null, 2));
            
            // Procesar la confirmación del pago
            const result = await paymentData.processPaymentConfirmation(req.query);
            res.status(200).send('OK');
        } catch (error) {
            console.error('Error al procesar confirmación de pago:', error);
            res.status(200).send('OK');
        }
    }
    
    // Endpoint para recibir al usuario después del pago
    async paymentResponse(req, res) {
        try {
            const frontendUrl = process.env.FRONTEND_URL;
            
            // Procesar la respuesta del pago
            const result = paymentData.processPaymentResponse(req.query);
            
            if (!result.success) {
                return res.redirect(`${frontendUrl}${result.redirectUrl}?${result.queryParams}`);
            }
            
            // Redirigir al usuario
            res.redirect(`${frontendUrl}${result.redirectUrl}?${result.queryParams}`);
        } catch (error) {
            console.error('Error en respuesta de pago:', error);
            const frontendUrl = process.env.FRONTEND_URL;
            res.redirect(`${frontendUrl}/payment/error?message=${encodeURIComponent('Error al procesar la respuesta del pago')}`);
        }
    }
}

module.exports = new PaymentController(); 