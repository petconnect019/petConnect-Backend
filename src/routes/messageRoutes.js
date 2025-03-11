const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { verifyToken, optionalAuth } = require('../middlewares/authMiddleware');

// Ruta para enviar mensaje al dueño de una mascota (autenticación opcional)
router.post('/send', optionalAuth, messageController.sendMessageToOwner);

// Rutas que requieren autenticación
router.use(verifyToken);

// Obtener mensajes del usuario
router.get('/user', messageController.getUserMessages);

// Marcar mensaje como leído
router.patch('/:messageId/read', messageController.markMessageAsRead);

module.exports = router; 