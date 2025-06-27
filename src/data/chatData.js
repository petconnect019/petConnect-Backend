const UserModel = require('../models/UserModel');
const PetModel = require('../models/PetModel');
const ChatModel = require('../models/ChatModel');
const socketService = require('../services/socketService');

const chatData = {
  /**
   * Verifica si un usuario tiene acceso a un chat con el dueño de una mascota
   * @param {string} userId - ID del usuario
   * @param {string} petId - ID de la mascota
    */
  async userHasAccessToPetOwnerChat(userId, petId) {
    try {
      // Verificar que la mascota existe
      const pet = await PetModel.findById(petId);
      if (!pet) {
        throw new Error('Mascota no encontrada');
      }
      
      // Verificar que el usuario no es el dueño de la mascota
      if (pet.owner.toString() === userId) {
        throw new Error('No puedes iniciar un chat contigo mismo');
      }
      
      return true;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Inicia un chat con el dueño de una mascota
   * @param {string} userId - ID del usuario que inicia el chat
   * @param {string} petId - ID de la mascota
   */
  async startChatWithPetOwner(userId, petId) {
    try {
      // Verificar acceso
      await this.userHasAccessToPetOwnerChat(userId, petId);
      
      // Obtener la mascota y su dueño
      const pet = await PetModel.findById(petId).populate('owner', 'name email profilePicture');
      if (!pet) {
        throw new Error('Mascota no encontrada');
      }

      // Obtener información del usuario que inicia el chat
      const initiator = await UserModel.findById(userId).select('name email profilePicture');
      if (!initiator) {
        throw new Error('Usuario no encontrado');
      }

      // Verificar si ya existe un chat entre estos usuarios para esta mascota
      const existingChat = await ChatModel.findOne({
        petId: pet._id,
        'owner.userId': pet.owner._id,
        'participants.userId': userId
      });

      if (existingChat) {
        return {
          _id: existingChat._id,
          petId: existingChat.petId,
          petName: pet.name,
          otherUser: {
            _id: pet.owner._id,
            name: pet.owner.name,
            email: pet.owner.email,
            profilePicture: pet.owner.profilePicture
          }
        };
      }

      // Crear nuevo chat
      const newChat = new ChatModel({
        petId: pet._id,
        owner: {
          userId: pet.owner._id,
          lastRead: null
        },
        participants: [{
          userId: userId,
          lastRead: null
        }],
        messages: [],
        lastMessage: null
      });

      await newChat.save();

      // Notificar al dueño de la mascota si está conectado
      socketService.sendDirectMessage(pet.owner._id.toString(), 'chat_request', {
        chatId: newChat._id,
        petId: pet._id,
        petName: pet.name,
        chat: {
          _id: newChat._id,
          petId: pet._id,
          petName: pet.name,
          otherUser: {
            _id: initiator._id,
            name: initiator.name,
            email: initiator.email,
            profilePicture: initiator.profilePicture
          },
          lastMessage: null,
          createdAt: newChat.createdAt,
          updatedAt: newChat.updatedAt
        },
        from: {
          _id: initiator._id,
          name: initiator.name,
          email: initiator.email,
          profilePicture: initiator.profilePicture
        },
        timestamp: new Date()
      });

      return {
        _id: newChat._id,
        petId: newChat.petId,
        petName: pet.name,
        otherUser: {
          _id: pet.owner._id,
          name: pet.owner.name,
          email: pet.owner.email,
          profilePicture: pet.owner.profilePicture
        }
      };
    } catch (error) {
      console.error('Error en startChatWithPetOwner:', error);
      throw error;
    }
  },
  
  /**
   * Envía un mensaje al dueño de una mascota, creando el chat si no existe.
   * @param {string} userId - ID del usuario que envía el mensaje
   * @param {string} petId - ID de la mascota
   * @param {string} content - Contenido del mensaje
   * @param {Object} location - Ubicación opcional (actualmente no se usa, pero se mantiene por compatibilidad)
   */
  async sendMessageToPetOwner(userId, petId, content, location = null) {
    try {
      // Iniciar o encontrar el chat con el dueño de la mascota
      const chatInfo = await this.startChatWithPetOwner(userId, petId);

      if (!chatInfo || !chatInfo._id) {
        throw new Error('No se pudo iniciar o encontrar el chat.');
      }

      // Agregar el mensaje al chat
      const messageInfo = await this.addMessageToChat(chatInfo._id, userId, content);
      
      return messageInfo;
    } catch (error) {
      console.error('Error en sendMessageToPetOwner:', error);
      throw error;
    }
  },
  
  /**
   * Envía un mensaje a un usuario que encontró una mascota, creando el chat si no existe.
   * @param {string} ownerId - ID del dueño de la mascota (remitente)
   * @param {string} finderId - ID del usuario que encontró la mascota (destinatario)
   * @param {string} petId - ID de la mascota
   * @param {string} content - Contenido del mensaje
    */
  async sendMessageToPetFinder(ownerId, finderId, petId, content) {
    try {
      // Verificar que la mascota existe y pertenece al dueño
      const pet = await PetModel.findOne({ _id: petId, owner: ownerId });
      if (!pet) {
        throw new Error('Mascota no encontrada o no eres el dueño');
      }

      // Verificar que el dueño no se está enviando un mensaje a sí mismo
      if (ownerId === finderId) {
        throw new Error('No puedes enviarte un mensaje a ti mismo.');
      }

      // Buscar un chat existente entre el dueño y el "finder" para esta mascota
      let chat = await ChatModel.findOne({
        petId: petId,
        'owner.userId': ownerId,
        'participants.userId': finderId,
      });

      // Si no existe, crear un nuevo chat
      if (!chat) {
        chat = new ChatModel({
          petId: petId,
          owner: { userId: ownerId },
          participants: [{ userId: finderId }],
          messages: [],
          lastMessage: null,
        });
        await chat.save();

        // Opcional: Notificar al "finder" sobre el nuevo chat
        const owner = await UserModel.findById(ownerId).select('name profilePicture');
        socketService.sendDirectMessage(finderId, 'chat_request', {
          chatId: chat._id,
          petName: pet.name,
          from: {
            _id: owner._id,
            name: owner.name,
            profilePicture: owner.profilePicture
          }
        });
      }

      // Agregar el mensaje al chat
      const messageInfo = await this.addMessageToChat(chat._id, ownerId, content);

      return messageInfo;
    } catch (error) {
      console.error('Error en sendMessageToPetFinder:', error);
      throw error;
    }
  },

  /**
   * Agrega un mensaje a un chat y lo guarda en la base de datos.
   * @param {string} chatId - ID del chat.
   * @param {string} senderId - ID del remitente.
   * @param {string} content - Contenido del mensaje.
   * @returns {Promise<object>} El mensaje guardado con información del remitente.
   */
  async addMessageToChat(chatId, senderId, content) {
    try {
      // Verificar acceso al chat
      await this.userHasAccessToChat(senderId, chatId);

      // Crear el nuevo mensaje
      const newMessage = {
        senderId,
        content,
        timestamp: new Date(),
        read: false
      };

      // Agregar mensaje al chat, actualizar lastMessage y guardar
      const updatedChat = await ChatModel.findByIdAndUpdate(
        chatId,
        {
          $push: { messages: newMessage },
          $set: { lastMessage: newMessage }
        },
        { new: true }
      );

      if (!updatedChat) {
        throw new Error('No se pudo agregar el mensaje al chat.');
      }

      // Obtener el mensaje recién agregado con la información del remitente
      const populatedChat = await ChatModel.findById(chatId)
        .populate({
          path: 'messages.senderId',
          select: 'name profilePicture',
          model: 'User'
        });
      
      const sentMessage = populatedChat.messages[populatedChat.messages.length - 1];

      // Notificar a los participantes del chat a través de sockets
      const otherParticipants = [
        updatedChat.owner.userId.toString(),
        ...updatedChat.participants.map(p => p.userId.toString())
      ].filter(id => id !== senderId);

      otherParticipants.forEach(participantId => {
        socketService.sendDirectMessage(participantId, 'new_message', {
          chatId,
          message: sentMessage
        });
      });

      return sentMessage;
    } catch (error) {
      console.error('Error en addMessageToChat:', error);
      throw error;
    }
  },

  /**
   * Obtiene todos los chats de un usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<Array>} Lista de chats del usuario
   */
  async getUserChats(userId) {
    try {
      // Buscar chats donde el usuario es participante o dueño
      const chats = await ChatModel.find({
        $or: [
          { 'participants.userId': userId },
          { 'owner.userId': userId }
        ]
      })
      .populate('participants.userId', 'name email profilePicture')
      .populate('owner.userId', 'name email profilePicture')
      .populate('petId', 'name photos')
      .sort({ updatedAt: -1 });

      // Si no hay chats, retornar array vacío
      if (!chats) return [];

      // Formatear los chats para el frontend
      return chats.map(chat => {
        const isOwner = chat.owner.userId._id.toString() === userId;
        const otherUser = isOwner 
          ? chat.participants[0]?.userId 
          : chat.owner.userId;

        // Contar mensajes no leídos
        const userLastRead = isOwner 
          ? chat.owner.lastRead 
          : chat.participants.find(p => p.userId._id.toString() === userId)?.lastRead;
        
        const unreadCount = userLastRead 
          ? chat.messages.filter(msg => 
              msg.timestamp > userLastRead && 
              msg.senderId.toString() !== userId
            ).length 
          : chat.messages.length;

        return {
          _id: chat._id,
          petId: chat.petId._id,
          petName: chat.petId.name,
          otherUser: {
            _id: otherUser._id,
            name: otherUser.name,
            email: otherUser.email,
            profilePicture: otherUser.profilePicture
          },
          lastMessage: chat.lastMessage,
          unreadCount,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt
        };
      });
    } catch (error) {
      console.error('Error al obtener chats:', error);
      return [];
    }
  },

  /**
   * Obtiene los mensajes de un chat específico y actualiza la marca de tiempo de "lastRead".
   * @param {string} userId - ID del usuario que solicita los mensajes.
   * @param {string} chatId - ID del chat.
   * @returns {Promise<Array>} Lista de mensajes del chat.
   */
  async getMessagesForChat(userId, chatId) {
    try {
      // Verificar acceso al chat
      await this.userHasAccessToChat(userId, chatId);

      // Obtener mensajes del chat con información del remitente
      const chat = await ChatModel.findById(chatId)
        .populate({
          path: 'messages.senderId',
          select: 'name profilePicture'
        });

      if (!chat) {
        throw new Error('Chat no encontrado');
      }

      // Actualizar lastRead para el usuario actual
      const isOwner = chat.owner.userId.toString() === userId;
      if (isOwner) {
        chat.owner.lastRead = new Date();
      } else {
        const participant = chat.participants.find(p => p.userId.toString() === userId);
        if (participant) {
          participant.lastRead = new Date();
        }
      }
      await chat.save();

      return chat.messages;
    } catch (error) {
      console.error('Error en getMessagesForChat:', error);
      throw error;
    }
  },

  /**
   * Verifica si un usuario tiene acceso a un chat
   * @param {string} userId - ID del usuario
   * @param {string} chatId - ID del chat
   */
  async userHasAccessToChat(userId, chatId) {
    try {
      const chat = await ChatModel.findById(chatId);
      if (!chat) {
        throw new Error('Chat no encontrado');
      }

      // Verificar si el usuario es el dueño o un participante
      const isOwner = chat.owner.userId.toString() === userId;
      const isParticipant = chat.participants.some(p => p.userId.toString() === userId);

      if (!isOwner && !isParticipant) {
        throw new Error('No tienes permiso para acceder a este chat');
      }

      return true;
    } catch (error) {
      console.error('Error en userHasAccessToChat:', error);
      throw error;
    }
  },

  /**
   * Inicia o encuentra un chat entre dos usuarios y envía un mensaje inicial.
   * @param {string} senderId - ID del remitente.
   * @param {string} recipientId - ID del destinatario.
   * @param {string} initialMessage - El primer mensaje del chat.
   * @returns {Promise<object>} Información del chat.
   */
  async startChatWithUser(senderId, recipientId, initialMessage) {
    try {
      if (senderId === recipientId) {
        throw new Error('No puedes iniciar un chat contigo mismo');
      }

      // Buscar si ya existe un chat "general" entre estos dos usuarios (sin mascota)
      let chat = await ChatModel.findOne({
        petId: null,
        $or: [
          { 'owner.userId': senderId, 'participants.userId': recipientId },
          { 'owner.userId': recipientId, 'participants.userId': senderId }
        ]
      });

      // Si no existe, crear un nuevo chat
      if (!chat) {
        const sender = await UserModel.findById(senderId);
        const recipient = await UserModel.findById(recipientId);
        if (!sender || !recipient) {
          throw new Error('Usuario no encontrado');
        }

        chat = new ChatModel({
          petId: null, // Chat no asociado a una mascota
          owner: { userId: senderId },
          participants: [{ userId: recipientId }],
          messages: [],
          lastMessage: null,
        });
        await chat.save();
        
        // Notificar al destinatario sobre la nueva solicitud de chat
        socketService.sendDirectMessage(recipientId, 'chat_request', {
          chatId: chat._id,
          from: {
            _id: sender._id,
            name: sender.name,
            profilePicture: sender.profilePicture
          }
        });
      }

      // Agregar el mensaje inicial al chat
      await this.addMessageToChat(chat._id, senderId, initialMessage);

      // Devolver el ID del chat para la redirección
      return { _id: chat._id };
    } catch (error) {
      console.error('Error en startChatWithUser:', error);
      throw error;
    }
  }
};

module.exports = chatData; 