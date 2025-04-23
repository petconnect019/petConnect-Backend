const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/controllerPayment/paymentController');

// Ruta para manejar la confirmación del pago
router.post('/confirmation', paymentController.handlePaymentConfirmation);

// Ruta para verificar el estado de un pago
router.get('/verify/:paymentId', paymentController.verifyPayment);

module.exports = router; 