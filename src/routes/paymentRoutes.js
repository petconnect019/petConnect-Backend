const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/controllerPayment/paymentController');

// Ruta para la respuesta de pago (redirección del usuario)
router.get('/api/payments/response', paymentController.paymentResponse);

// Ruta para el webhook de ePayco
router.post('/api/payments/confirmation', paymentController.confirmPayment);
console.log('Confirmacion de pago recibida');

module.exports = router; 