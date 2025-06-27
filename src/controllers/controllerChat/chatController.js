const chatData = require('../../data/chatData');
const socketService = require('../../services/socketService');
const ChatModel = require('../../models/ChatModel');
const UserModel = require('../../models/UserModel');

const chatController = {
  // Obtener todos los chats del usuario
  getUserChats: async (req, res) => {
    try {
      const userId = req.user.id;
      const chats = await chatData.getUserChats(userId);
      
      // Si no hay chats, devolvemos un array vacío
      if (!chats) {
        return res.json({
          success: true,
          chats: [],
          message: 'No hay conversaciones disponibles'
        });
      }
      
      res.json({
        success: true,
        chats
      });
    } catch (error) {
      console.error('Error al obtener chats del usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },
  
  // Obtener mensajes de un chat
  async getChatMessages(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user.id;

      const messages = await chatData.getMessagesForChat(userId, chatId);

      res.json({
        success: true,
        messages: messages
      });
    } catch (error) {
      console.error('Error al obtener mensajes del chat:', error);
      
      let statusCode = 500;
      if (error.message.includes('permiso')) {
        statusCode = 403;
      } else if (error.message.includes('encontrado')) {
        statusCode = 404;
      }

      res.status(statusCode).json({
        success: false,
        message: 'Error al obtener mensajes',
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
  },

  async sendMessage(req, res) {
    try {
      const { chatId } = req.params;
      const { content } = req.body;
      const userId = req.user.id;

      if (!content || content.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'El contenido del mensaje no puede estar vacío.'
        });
      }

      const sentMessage = await chatData.addMessageToChat(chatId, userId, content);

      res.status(201).json({
        success: true,
        message: 'Mensaje enviado exitosamente',
        data: sentMessage
      });
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      res.status(error.message.includes('permiso') ? 403 : 500).json({
        success: false,
        message: 'Error al enviar el mensaje',
        error: error.message
      });
    }
  },

  // Iniciar un chat con un usuario y enviar un mensaje inicial
  async startChatWithUser(req, res) {
    try {
      const { recipientId } = req.params;
      const { initialMessage } = req.body;
      const senderId = req.user.id;

      // Validación del mensaje inicial
      if (!initialMessage || initialMessage.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'El mensaje no puede estar vacío'
        });
      }

      // Validación del destinatario
      if (!recipientId) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere un destinatario válido'
        });
      }

      // Validar que el destinatario existe
      const recipient = await UserModel.findById(recipientId);
      if (!recipient) {
        return res.status(404).json({
          success: false,
          message: 'El usuario destinatario no existe'
        });
      }

      // Validar que no es un chat consigo mismo
      if (senderId === recipientId) {
        return res.status(400).json({
          success: false,
          message: 'No puedes iniciar un chat contigo mismo'
        });
      }

      const chatInfo = await chatData.startChatWithUser(senderId, recipientId, initialMessage);

      res.status(201).json({
        success: true,
        message: 'Chat iniciado y mensaje enviado exitosamente',
        chat: chatInfo
      });
    } catch (error) {
      console.error('Error al iniciar chat con usuario:', error);
      
      // Manejar errores específicos
      if (error.message.includes('contigo mismo')) {
        return res.status(400).json({
          success: false,
          message: 'No puedes iniciar un chat contigo mismo'
        });
      }
      
      if (error.message.includes('no encontrado')) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Error general del servidor
      res.status(500).json({
        success: false,
        message: 'Error al iniciar el chat. Por favor, intenta de nuevo más tarde.',
        error: error.message
      });
    }
  }
};

module.exports = chatController; 