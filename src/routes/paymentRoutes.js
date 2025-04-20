const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/controllerOrder/paymentController');

// Ruta para confirmación de pago desde ePayco
router.post('/confirmation', PaymentController.handlePaymentConfirmation);

// Ruta para verificar estado de pago
router.get('/verify/:paymentId', PaymentController.verifyPayment);

module.exports = router; 