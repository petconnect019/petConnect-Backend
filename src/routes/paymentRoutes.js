const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/controllerPayment/paymentController');

// Ruta para manejar la confirmación del pago
router.post('/confirmation', paymentController.handlePaymentConfirmation);

module.exports = router; 