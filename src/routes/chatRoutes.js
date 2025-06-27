const express = require('express');
const router = express.Router();
const chatController = require('../controllers/controllerChat/chatController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Todas las rutas de chat requieren autenticación
router.use(verifyToken);

// Obtener todos los chats del usuario
router.get('/', chatController.getUserChats);

// Obtener mensajes de un chat
router.get('/:chatId/messages', chatController.getChatMessages);

// Enviar mensaje en un chat
router.post('/:chatId/messages', chatController.sendMessage);

// Iniciar chat con el dueño de una mascota
router.post('/pet/:petId/start', chatController.startChatWithPetOwner);

// Enviar mensaje al dueño de una mascota
router.post('/pet/:petId/message', chatController.sendMessageToPetOwner);

// Enviar mensaje a un usuario que encontró una mascota
router.post('/finder/:finderId/pet/:petId/message', chatController.sendMessageToPetFinder);

// Iniciar un chat con un usuario y enviar un mensaje inicial
router.post('/user/:recipientId/start', chatController.startChatWithUser);

module.exports = router; 