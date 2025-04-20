const express = require('express');
const router = express.Router();
const epaycoController = require('../controllers/epayco.controller');
const orderController = require('../controllers/controllerOrder/orderController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Manejar solicitudes OPTIONS para todas las rutas
router.options('*', (req, res) => {
    res.status(200).end();
});

// Rutas protegidas que requieren autenticación
router.post('/epayco/create', verifyToken, epaycoController.createPayment);
router.get('/orders/user/:userId', verifyToken, orderController.getUserOrders);
router.get('/orders/:orderId', verifyToken, orderController.getOrderById);

// Rutas públicas para webhook de ePayco
router.post('/epayco/confirmation', epaycoController.handleConfirmation);
router.post('/epayco/client-confirmation', epaycoController.handleClientConfirmation);

// Endpoint directo para depuración
router.post('/epayco/debug-client-confirmation', (req, res) => {
    console.log('Debug client confirmation:', req.body);
    res.json({
        success: true,
        message: 'Debug confirmation received',
        body: req.body
    });
});

// Ruta para obtener códigos QR de un cliente
router.get('/epayco/qrcodes/:customerId', epaycoController.getCustomerQRCodes);

// Ruta para crear órdenes de prueba con códigos QR (sólo para desarrollo)
router.post('/test/create-order', epaycoController.createTestOrder);

module.exports = router; 