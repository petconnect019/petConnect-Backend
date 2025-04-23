const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/controllerPayment/paymentController');

// Ruta para la respuesta de pago (redirección del usuario)
router.get('/api/payments/response', paymentController.paymentResponse);

// Ruta para recibir la confirmación de pago
router.post('/api/payments/confirmation', (req, res) => {
    const paymentData = req.body;

    // Procesar la confirmación de pago
    console.log('Confirmación de pago recibida:', paymentData);

    // Aquí puedes validar el estado del pago y actualizar tu base de datos

    // Responder a Epayco con un código 200
    res.status(200).send('OK');
});


module.exports = router; 