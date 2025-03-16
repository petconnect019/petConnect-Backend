const chatData = require('../../data/chatData');
const socketService = require('../../services/socketService');

const chatController = {
  // Obtener todos los chats del usuario
  getUserChats: async (req, res) => {
    try {
      const userId = req.user.id;
      const chats = await chatData.getUserChats(userId);
      
      res.json({
        success: true,
        chats
      });
    } catch (error) {
      console.error('Error al obtener chats del usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los chats',
        error: error.message
      });
    }
  },
  
  // Obtener mensajes de un chat
  getChatMessages: async (req, res) => {
    try {
      const { chatId } = req.params;
      const userId = req.user.id;
      
      // Verificar que el usuario es participante del chat
      const hasAccess = await chatData.userHasAccessToChat(userId, chatId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para acceder a este chat'
        });
      }
      
      const messages = await chatData.getChatMessages(chatId);
      
      res.json({
        success: true,
        messages
      });
    } catch (error) {
      console.error('Error al obtener mensajes del chat:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los mensajes',
        error: error.message
      });
    }
  },
  
  // Iniciar chat con el dueño de una mascota
  startChatWithPetOwner: async (req, res) => {
    try {
      const { petId } = req.params;
      const userId = req.user.id;
      
      const chatInfo = await chatData.startChatWithPetOwner(userId, petId);
      
      res.json({
        success: true,
        chat: chatInfo
      });
    } catch (error) {
      console.error('Error al iniciar chat con dueño de mascota:', error);
      
      if (error.message === 'Mascota no encontrada') {
        return res.status(404).json({
          success: false,
          message: 'Mascota no encontrada'
        });
      }
      
      if (error.message === 'No puedes iniciar un chat contigo mismo') {
        return res.status(400).json({
          success: false,
          message: 'No puedes iniciar un chat contigo mismo'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error al iniciar el chat',
        error: error.message
      });
    }
  },
  
  // Enviar mensaje al dueño de una mascota
  sendMessageToPetOwner: async (req, res) => {
    try {
      const { petId } = req.params;
      const { content, location } = req.body;
      const userId = req.user.id;
      
      const messageInfo = await chatData.sendMessageToPetOwner(userId, petId, content, location);
      
      res.json({
        success: true,
        message: messageInfo
      });
    } catch (error) {
      console.error('Error al enviar mensaje al dueño de la mascota:', error);
      
      if (error.message === 'Mascota no encontrada') {
        return res.status(404).json({
          success: false,
          message: 'Mascota no encontrada'
        });
      }
      
      if (error.message === 'No puedes iniciar un chat contigo mismo') {
        return res.status(400).json({
          success: false,
          message: 'No puedes iniciar un chat contigo mismo'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error al enviar el mensaje',
        error: error.message
      });
    }
  },
  
  // Enviar mensaje a un usuario que encontró una mascota
  sendMessageToPetFinder: async (req, res) => {
    try {
      const { finderId, petId } = req.params;
      const { content } = req.body;
      const ownerId = req.user.id;
      
      const messageInfo = await chatData.sendMessageToPetFinder(ownerId, finderId, petId, content);
      
      res.json({
        success: true,
        message: messageInfo
      });
    } catch (error) {
      console.error('Error al enviar mensaje al usuario que encontró la mascota:', error);
      
      if (error.message === 'Mascota no encontrada o no eres el dueño') {
        return res.status(403).json({
          success: false,
          message: 'Mascota no encontrada o no eres el dueño'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error al enviar el mensaje',
        error: error.message
      });
    }
  }
};

module.exports = chatController; 