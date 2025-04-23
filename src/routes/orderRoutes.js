const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/controllerOrder/orderController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Rutas de órdenes
router.post('/', OrderController.createOrder);
router.post('/:orderId/confirm', OrderController.confirmOrder);
router.get('/', OrderController.getUserOrders);
router.get('/:orderId', OrderController.getOrderById);
router.get('/:orderId/invoice', OrderController.downloadInvoice);

module.exports = router; 