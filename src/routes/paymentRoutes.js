const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/controllerPayment/paymentController');

// Ruta para la respuesta de pago (redirección del usuario)
router.get('/api/payments/response', paymentController.paymentResponse);


// Ruta para recibir la confirmación de pago
router.post('/api/payments/confirmation', paymentController.confirmPayment);
module.exports = router; 

