const express = require('express');
const router = express.Router();
const epaycoController = require('../controllers/epayco.controller');
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware');

// Manejar solicitudes OPTIONS para todas las rutas
router.options('*', (req, res) => {
    res.status(200).end();
});

// Rutas protegidas que requieren autenticación
router.post('/epayco/create', authMiddleware, epaycoController.createPayment);
router.get('/orders/user/:userId', authMiddleware, orderController.getUserOrders);
router.get('/orders/:orderId', authMiddleware, orderController.getOrderById);

// Ruta pública para webhook de ePayco
router.post('/epayco/confirmation', epaycoController.handleConfirmation);

// Ruta para obtener códigos QR de un cliente
router.get('/epayco/qrcodes/:customerId', epaycoController.getCustomerQRCodes);

module.exports = router; 