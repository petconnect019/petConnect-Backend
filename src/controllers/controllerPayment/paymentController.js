const paymentData = require('../../data/paymentData');

class PaymentController {

      // Endpoint para manejar la confirmación del pago
      async handlePaymentConfirmation(req, res) {
        try {
            // Procesar la confirmación del pago
            const result = await paymentData.processPaymentConfirmation(req.body);
            
            res.status(200).json(result);
        } catch (error) {
            console.error('Error al procesar confirmación de pago:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    
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

  
}

module.exports = new PaymentController(); 