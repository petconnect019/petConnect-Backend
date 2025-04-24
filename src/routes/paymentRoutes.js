const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/controllerPayment/paymentController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Rutas públicas para Epayco (no requieren autenticación)
// Ruta para la respuesta de pago (redirección del usuario)
router.get('/payments/response', paymentController.paymentResponse);

// Ruta para recibir la confirmación de pago
router.post('/payments/confirmation', paymentController.confirmPayment);

// Otras rutas de pago que requieren autenticación
router.use(verifyToken);

module.exports = router; 

