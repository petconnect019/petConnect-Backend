const paymentData = require('../../data/paymentData');

class PaymentController {
    // Webhook para recibir notificaciones de ePayco
    async confirmPayment(req, res) {
        try {
            console.log('Recibida confirmación de pago de ePayco:', {
                body: req.body,
                query: req.query
            });

            // Obtener datos del pago (pueden venir en body o query)
            const paymentInfo = req.method === 'POST' ? req.body : req.query;
            
            // Procesar la confirmación del pago
            await paymentData.handlePaymentConfirmation(paymentInfo);

            // Siempre responder OK a Epayco
            return res.status(200).send('OK');
        } catch (error) {
            console.error('Error al confirmar el pago:', error);
            return res.status(200).send('OK'); // Siempre responder 200 a ePayco
        }
    }

    // Endpoint para recibir al usuario después del pago
    async paymentResponse(req, res) {
        try {
            console.log('Recibida respuesta de pago:', req.query);
            
            const frontendUrl = process.env.FRONTEND_URL || 'https://pet-connect-front-nu.vercel.app';
            
            // Procesar la respuesta del pago
            const result = paymentData.processPaymentResponse(req.query);
            
            // Redirigir al usuario
            const redirectUrl = `${frontendUrl}${result.redirectUrl}?${result.queryParams}`;
            console.log('Redirigiendo a:', redirectUrl);
            
            res.redirect(redirectUrl);
        } catch (error) {
            console.error('Error en respuesta de pago:', error);
            const frontendUrl = process.env.FRONTEND_URL || 'https://pet-connect-front-nu.vercel.app';
            res.redirect(`${frontendUrl}/payment/error?message=${encodeURIComponent('Error al procesar la respuesta del pago')}`);
        }
    }
}

module.exports = new PaymentController(); 