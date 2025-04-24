const express = require('express');
const router = express.Router();
const paymentController = require('../data/paymentData');
const { verifyToken } = require('../middlewares/authMiddleware');


// Ruta para la respuesta de pago (redirección del usuario)
router.get('/payments/response', async (req, res, next) => {
    try {
        const result = await paymentController.processPaymentResponse(req.query);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

// Ruta para recibir la confirmación de pago
router.post('/payments/confirmation', async (req, res, next) => {
    try {
        const result = await paymentController.processPaymentConfirmation(req.body);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

// Otras rutas de pago que requieren autenticación
router.use(verifyToken);

module.exports = router; 

