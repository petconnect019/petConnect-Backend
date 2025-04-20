const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/controllerPayment/paymentController');
const auth = require('../middlewares/authMiddleware');

// Ruta para la confirmación de pago (webhook) - No requiere autenticación
router.post('/confirmation', paymentController.confirmPayment);

// Ruta para la respuesta de pago (redirección del usuario) - No requiere autenticación
router.get('/response', paymentController.paymentResponse);

module.exports = router; 