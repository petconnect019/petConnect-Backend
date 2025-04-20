const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/controllerOrder/paymentController');

// Ruta para confirmación de pago desde ePayco
router.post('/confirmation', PaymentController.handlePaymentConfirmation);

module.exports = router; 