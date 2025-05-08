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
   * Envía un mensaje al dueño de una mascota
   * @param {string} userId - ID del usuario que envía el mensaje
   * @param {string} petId - ID de la mascota
   * @param {string} content - Contenido del mensaje
   * @param {Object} location - Ubicación opcional
   */
  async sendMessageToPetOwner(userId, petId, content, location = null) {
    try {
      // Verificar acceso
      await this.userHasAccessToPetOwnerChat(userId, petId);
      
      // Obtener la mascota y su dueño
      const pet = await PetModel.findById(petId);
      const user = await UserModel.findById(userId).select('name email profilePicture');
      
      // Crear objeto de mensaje (sin persistir en base de datos)
      const messageInfo = {
        petId,
        senderId: userId,
        senderName: user.name,
        senderEmail: user.email,
        senderProfilePicture: user.profilePicture,
        receiverId: pet.owner,
        content,
        location,
        timestamp: new Date()
      };
      
      // Enviar mensaje al dueño de la mascota si está conectado
      socketService.sendDirectMessage(pet.owner.toString(), 'pet_message', messageInfo);
      
      return messageInfo;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Envía un mensaje a un usuario que encontró una mascota
   * @param {string} ownerId - ID del dueño de la mascota
   * @param {string} finderId - ID del usuario que encontró la mascota
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
      
      const owner = await UserModel.findById(ownerId).select('name email profilePicture');
      
      // Crear objeto de mensaje (sin persistir en base de datos)
      const messageInfo = {
        petId,
        senderId: ownerId,
        senderName: owner.name,
        senderEmail: owner.email,
        senderProfilePicture: owner.profilePicture,
        receiverId: finderId,
        content,
        timestamp: new Date()
      };
      
      // Enviar mensaje al usuario que encontró la mascota si está conectado
      socketService.sendDirectMessage(finderId, 'owner_message', messageInfo);
      
      return messageInfo;
    } catch (error) {
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
  }
};

module.exports = chatData; 