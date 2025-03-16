const express = require('express');
const router = express.Router();
const qrController = require('../controllers/controllerQR/qrController');
const { verifyToken, isAdmin, optionalAuth } = require('../middlewares/authMiddleware');

// Rutas públicas
router.get('/scan/:qrId', optionalAuth, qrController.scanQR);

// Rutas protegidas
router.use(verifyToken);

// Rutas para usuarios normales
router.post('/link', qrController.linkQRToPet);
router.get('/user', qrController.getUserQRs);

// Rutas para administradores
router.use(isAdmin);
router.post('/generate', qrController.generateQR);
router.post('/generate-multiple', qrController.generateMultipleQRs);
router.get('/', qrController.getAllQRs);
router.delete('/:qrId', qrController.deactivateQR);

module.exports = router; 