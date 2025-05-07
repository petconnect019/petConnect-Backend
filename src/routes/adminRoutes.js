const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/controllerrAdmin/adminController');
const QRController = require('../controllers/controllerQR/qrController');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');

// Todas las rutas de admin requieren autenticación y rol de admin
router.use(verifyToken, isAdmin);

// Gestión de usuarios
router.get('/users', AdminController.getAllUsers);
router.delete('/users/:id', AdminController.deleteUser);
router.put('/users/:id', AdminController.updateUser);
router.put('/users/:id/role', AdminController.changeUserRole);

// Generar QR para usuario
router.get('/users/:userId/qr', QRController.generateUserQR);

module.exports = router; 