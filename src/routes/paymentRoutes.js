const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/controllerPayment/paymentController');

// Ruta para la respuesta de pago (redirección del usuario)
router.get('/response', paymentController.paymentResponse);

// Ruta para el webhook de ePayco
router.post('/confirmation', paymentController.confirmPayment);

module.exports = router; 