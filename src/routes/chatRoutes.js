const express = require('express');
const router = express.Router();
const chatController = require('../controllers/controllerChat/chatController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Todas las rutas de chat requieren autenticación
router.use(verifyToken);

// Iniciar chat con el dueño de una mascota
router.post('/pet/:petId/start', chatController.startChatWithPetOwner);

// Enviar mensaje al dueño de una mascota
router.post('/pet/:petId/message', chatController.sendMessageToPetOwner);

// Enviar mensaje a un usuario que encontró una mascota
router.post('/finder/:finderId/pet/:petId/message', chatController.sendMessageToPetFinder);

module.exports = router; 