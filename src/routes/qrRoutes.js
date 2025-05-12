const express = require('express');
const router = express.Router();
const QRController = require('../controllers/controllerQR/qrController');
const { verifyToken, isAdmin, optionalAuth } = require('../middlewares/authMiddleware');

// Rutas públicas
router.get('/scan/:qrId', optionalAuth, QRController.scanQR);

// Ruta para obtener historial de escaneos de un QR
router.get('/:qrId/history', verifyToken, QRController.getQRHistory);

// Middleware de autenticación para rutas protegidas
router.use(verifyToken);

// Rutas para usuarios normales
router.post('/link', QRController.linkQRToPet);
router.get('/user', QRController.getUserQRs);
router.delete('/:qrId', QRController.deleteQR);

// Rutas para administradores
router.use(isAdmin);
router.post('/generate-multiple', QRController.generateMultipleQRs);
router.post('/user/:userId', QRController.generateUserQR);
router.get('/', QRController.getAllQRs);
router.delete('/admin/:qrId', QRController.deactivateQR);

module.exports = router; 