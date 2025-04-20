const express = require('express');
const router = express.Router();
const QRController = require('../controllers/controllerQR/qrController');
const { verifyToken, isAdmin, optionalAuth } = require('../middlewares/authMiddleware');

// Rutas públicas
router.get('/scan/:qrId', optionalAuth, QRController.scanQR);

// Middleware de autenticación para rutas protegidas
router.use(verifyToken);

// Rutas para usuarios normales
router.post('/link', QRController.linkQRToPet);
router.get('/user', QRController.getUserQRs);
router.delete('/:qrId', QRController.deleteQR);
router.get('/user/my-codes', QRController.getUserQRCodes);
router.get('/:id', QRController.getQRById);

// Rutas para administradores
router.use(isAdmin);
router.post('/generate-multiple', QRController.generateMultipleQRs);
router.get('/', QRController.getAllQRs);
router.delete('/admin/:qrId', QRController.deactivateQR);

module.exports = router; 