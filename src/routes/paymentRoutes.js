const express = require('express');
const router = express.Router();
const paymentController = require('../data/paymentData');
const { verifyToken } = require('../middlewares/authMiddleware');

// Rutas públicas para Epayco (no requieren autenticación)
// Ruta para la respuesta de pago (redirección del usuario)
router.get('/payments/response', async (req, res, next) => {
    try {
        const result = await paymentController.processPaymentResponse(req.query);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

// Ruta para recibir la confirmación de pago (webhook de ePayco)
router.post('/payments/confirmation', express.raw({type: 'application/json'}), async (req, res) => {
    try {
        console.log('Webhook de ePayco recibido:', {
            body: req.body,
            query: req.query,
            headers: req.headers
        });

        // Procesar la confirmación
        const result = await paymentController.processPaymentConfirmation(
            typeof req.body === 'string' ? JSON.parse(req.body) : req.body
        );

        // Responder con código 200 y el resultado
        res.status(200).json(result);
    } catch (error) {
        console.error('Error en webhook de ePayco:', error);
        // Siempre responder con 200 al webhook, incluso en caso de error
        res.status(200).json({
            success: false,
            error: error.message
        });
    }
});

// Otras rutas de pago que requieren autenticación
router.use(verifyToken);

module.exports = router; 

