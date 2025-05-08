const chatData = require('../../data/chatData');
const socketService = require('../../services/socketService');
const ChatModel = require('../../models/ChatModel');

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

      // Verificar acceso al chat
      await chatData.userHasAccessToChat(userId, chatId);

      // Obtener mensajes del chat con información del remitente
      const chat = await ChatModel.findById(chatId)
        .populate({
          path: 'messages.senderId',
          select: 'name profilePicture'
        });

      if (!chat) {
        return res.status(404).json({
          success: false,
          message: 'Chat no encontrado'
        });
      }

      // Actualizar lastRead para el usuario actual
      if (chat.owner.userId.toString() === userId) {
        chat.owner.lastRead = new Date();
      } else {
        const participant = chat.participants.find(p => p.userId.toString() === userId);
        if (participant) {
          participant.lastRead = new Date();
        }
      }
      await chat.save();

      res.json({
        success: true,
        messages: chat.messages
      });
    } catch (error) {
      console.error('Error al obtener mensajes del chat:', error);
      res.status(error.message.includes('permiso') ? 403 : 500).json({
        success: false,
        message: error.message
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

      if (!content) {
        return res.status(400).json({
          success: false,
          message: 'El contenido del mensaje es requerido'
        });
      }

      // Verificar acceso al chat
      await chatData.userHasAccessToChat(userId, chatId);

      // Crear el nuevo mensaje
      const newMessage = {
        senderId: userId,
        content,
        timestamp: new Date(),
        read: false
      };

      // Agregar mensaje al chat y actualizar lastMessage
      const chat = await ChatModel.findById(chatId);
      chat.messages.push(newMessage);
      chat.lastMessage = newMessage;

      // Guardar el chat actualizado
      await chat.save();

      // Obtener el mensaje con la información del remitente
      const populatedChat = await ChatModel.findById(chatId)
        .populate({
          path: 'messages.senderId',
          select: 'name profilePicture'
        });

      const sentMessage = populatedChat.messages[populatedChat.messages.length - 1];

      // Notificar a los participantes del chat
      const otherParticipants = [
        chat.owner.userId.toString(),
        ...chat.participants.map(p => p.userId.toString())
      ].filter(id => id !== userId);

      otherParticipants.forEach(participantId => {
        socketService.sendDirectMessage(participantId, 'new_message', {
          chatId,
          message: sentMessage
        });
      });

      res.json({
        success: true,
        message: 'Mensaje enviado exitosamente',
        data: sentMessage
      });
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      res.status(error.message.includes('permiso') ? 403 : 500).json({
        success: false,
        message: error.message
      });
    }
  }
};

module.exports = chatController; 