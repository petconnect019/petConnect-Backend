const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/controllerPayment/paymentController');

// Ruta para la respuesta de pago (redirección del usuario)
router.get('/response', paymentController.paymentResponse);

// Ruta para manejar la confirmación del pago
router.post('/confirmation', paymentController.handlePaymentConfirmation);

module.exports = router; 