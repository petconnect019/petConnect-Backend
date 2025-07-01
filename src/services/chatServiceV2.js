const ChatModel = require('../models/ChatModel');
const UserModel = require('../models/UserModel');
const PetModel = require('../models/PetModel');
const socketService = require('./socketService');
const logger = require('../utils/logger');
const { validateObjectId, sanitizeInput } = require('../utils/validation');

/**
 * Servicio de chat refactorizado y optimizado
 * Versión limpia sin logs verbosos
 */
class ChatServiceV2 {
  
  /**
   * Crear un nuevo chat
   */
  async createChat(chatData) {
    try {
      const {
        chatType,
        participants,
        petId,
        title,
        createdBy,
        source = 'direct_message'
      } = chatData;

      // Validaciones básicas
      this._validateChatCreation({ chatType, participants, createdBy });

      // Verificar participantes
      const validParticipants = await this._validateParticipants(participants);
      
      // Verificar mascota si aplica
      if (petId) {
        await this._validatePet(petId);
      }

      // Crear estructura de participantes
      const participantsForChat = validParticipants.map(p => ({
        userId: p._id,
        role: p._id.toString() === createdBy.toString() ? 'owner' : 'participant',
        joinedAt: new Date(),
        isActive: true
      }));

      // Crear el chat
      const chat = new ChatModel({
        chatType,
        petId: petId || null,
        title: title || this._generateChatTitle(chatType, validParticipants),
        participants: participantsForChat,
        metadata: { createdBy, source },
        settings: {
          maxParticipants: chatType === 'group' ? 100 : 2
        }
      });

      await chat.save();
      
      // Notificar participantes
      await this._notifyParticipants(chat, 'chat_created', createdBy);

      logger.info(`Chat ${chat._id} creado por usuario ${createdBy}`);
      return await this.getChatById(chat._id, createdBy);

    } catch (error) {
      logger.error('Error al crear chat:', error);
      throw error;
    }
  }

  /**
   * Crear chat con documento directo (para uso interno)
   */
  async createChatDocument(chatData) {
    try {
      const { chatType, participants } = chatData;

      // Para chats directos, verificar si ya existe
      if (chatType === 'direct' && participants.length === 2) {
        const existingChat = await ChatModel.findOne({
          chatType: 'direct',
          'participants.userId': { $all: participants },
          'participants': { $size: 2 }
        }).populate('participants.userId', 'name email profilePicture');

        if (existingChat) {
          return existingChat;
        }
      }

      // Crear nuevo chat
      return await this._createNewChatDocument(chatData);

    } catch (error) {
      logger.error('Error al crear documento de chat:', error);
      throw error;
    }
  }

  /**
   * Obtener chat por ID
   */
  async getChatById(chatId, userId) {
    try {
      validateObjectId(chatId, 'chatId');
      validateObjectId(userId, 'userId');

      const chat = await ChatModel.findById(chatId)
        .populate('participants.userId', 'name email profilePicture')
        .populate('petId', 'name photos owner')
        .populate('lastMessage.senderId', 'name profilePicture');

      if (!chat) {
        throw new Error('Chat no encontrado');
      }

      if (!chat.isParticipant(userId)) {
        throw new Error('No tienes permisos para acceder a este chat');
      }

      return this._formatChatResponse(chat, userId);

    } catch (error) {
      logger.error(`Error al obtener chat ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Obtener chats del usuario
   */
  async getUserChats(userId, options = {}) {
    try {
      validateObjectId(userId, 'userId');

      const {
        page = 1,
        limit = 20,
        status = 'active',
        chatType,
        search
      } = options;

      const skip = (page - 1) * limit;
      
      // Construir query
      const query = this._buildChatsQuery(userId, { status, chatType, search });

      // Ejecutar consulta
      const [chats, total] = await Promise.all([
        ChatModel.find(query)
          .populate('participants.userId', 'name email profilePicture')
          .populate('petId', 'name photos')
          .populate('lastMessage.senderId', 'name profilePicture')
          .sort({ 'lastMessage.timestamp': -1, updatedAt: -1 })
          .limit(limit)
          .skip(skip),
        ChatModel.countDocuments(query)
      ]);

      const formattedChats = chats.map(chat => this._formatChatResponse(chat, userId));

      return {
        chats: formattedChats,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: skip + limit < total,
          hasPrev: page > 1
        }
      };

    } catch (error) {
      logger.error(`Error al obtener chats del usuario ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Enviar mensaje
   */
  async sendMessage(chatId, senderId, messageData) {
    try {
      validateObjectId(chatId, 'chatId');
      validateObjectId(senderId, 'senderId');

      const chat = await ChatModel.findById(chatId).populate('participants.userId', 'name');

      if (!chat) {
        throw new Error('Chat no encontrado');
      }

      if (!chat.isParticipant(senderId)) {
        throw new Error('No tienes permisos para acceder a este chat');
      }

      if (chat.status !== 'active') {
        throw new Error('No se pueden enviar mensajes en un chat inactivo');
      }

      // Validar y procesar mensaje
      const processedMessage = this._processMessage(messageData);
      
      // Crear mensaje
      const message = chat.addMessage({
        senderId,
        ...processedMessage
      });

      await chat.save();

      // Obtener mensaje poblado
      await chat.populate('messages.senderId', 'name profilePicture');
      const populatedMessage = chat.messages.id(message._id);

      // Notificar otros participantes
      await this._notifyNewMessage(chat, populatedMessage, senderId);

      // Actualizar actividad
      await this._updateParticipantActivity(chat, senderId);

      return populatedMessage;

    } catch (error) {
      logger.error(`Error al enviar mensaje en chat ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Marcar mensajes como leídos
   */
  async markMessagesAsRead(chatId, userId, messageIds = null) {
    try {
      validateObjectId(chatId, 'chatId');
      validateObjectId(userId, 'userId');

      const chat = await ChatModel.findById(chatId);
      if (!chat) {
        throw new Error('Chat no encontrado');
      }

      if (!chat.isParticipant(userId)) {
        throw new Error('No tienes permisos para acceder a este chat');
      }

      chat.markAsRead(userId, messageIds);
      await chat.save();

      await this._notifyReadStatus(chat, userId);

      return { success: true, readAt: new Date() };

    } catch (error) {
      logger.error('Error al marcar mensajes como leídos:', error);
      throw error;
    }
  }

  /**
   * Obtener mensajes del chat
   */
  async getChatMessages(chatId, userId, options = {}) {
    try {
      validateObjectId(chatId, 'chatId');
      validateObjectId(userId, 'userId');

      const { page = 1, limit = 50, before } = options;

      const chat = await ChatModel.findById(chatId)
        .populate('messages.senderId', 'name profilePicture');

      if (!chat) {
        throw new Error('Chat no encontrado');
      }

      if (!chat.isParticipant(userId)) {
        throw new Error('No tienes permisos para acceder a este chat');
      }

      // Procesar mensajes
      let messages = chat.activeMessages;

      if (before) {
        messages = messages.filter(m => m.timestamp < new Date(before));
      }

      messages.sort((a, b) => b.timestamp - a.timestamp);

      const skip = (page - 1) * limit;
      const paginatedMessages = messages.slice(skip, skip + limit);

      // Auto-marcar como leídos
      await this.markMessagesAsRead(chatId, userId);

      return {
        messages: paginatedMessages.reverse(),
        pagination: {
          page,
          limit,
          total: messages.length,
          hasMore: skip + limit < messages.length
        }
      };

    } catch (error) {
      logger.error(`Error al obtener mensajes del chat ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Iniciar chat con dueño de mascota
   */
  async startChatWithPetOwner(userId, petId) {
    try {
      validateObjectId(userId, 'userId');
      validateObjectId(petId, 'petId');

      const pet = await PetModel.findById(petId).populate('owner');
      if (!pet) {
        throw new Error('Mascota no encontrada');
      }

      if (pet.owner._id.toString() === userId.toString()) {
        throw new Error('No puedes iniciar un chat contigo mismo');
      }

      // Buscar chat existente
      const existingChat = await ChatModel.findBetweenUsers(userId, pet.owner._id, petId);
      
      if (existingChat) {
        return this._formatChatResponse(existingChat, userId);
      }

      // Crear nuevo chat
      const chatData = {
        chatType: 'pet_owner',
        participants: [userId, pet.owner._id],
        petId,
        createdBy: userId,
        source: 'pet_profile'
      };

      return await this.createChat(chatData);

    } catch (error) {
      logger.error('Error al iniciar chat con dueño de mascota:', error);
      throw error;
    }
  }

  /**
   * Archivar chat
   */
  async archiveChat(chatId, userId) {
    try {
      validateObjectId(chatId, 'chatId');
      validateObjectId(userId, 'userId');

      const chat = await ChatModel.findById(chatId);
      if (!chat) {
        throw new Error('Chat no encontrado');
      }

      if (!chat.isParticipant(userId)) {
        throw new Error('No tienes permisos para archivar este chat');
      }

      chat.status = 'archived';
      await chat.save();

      return { success: true, archivedAt: new Date() };

    } catch (error) {
      logger.error(`Error al archivar chat ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Obtener chats por mascota
   */
  async getChatsByPet(petId, userId) {
    try {
      validateObjectId(petId, 'petId');
      validateObjectId(userId, 'userId');

      const pet = await PetModel.findById(petId);
      if (!pet) {
        throw new Error('Mascota no encontrada');
      }

      const chats = await ChatModel.find({
        petId,
        'participants.userId': userId,
        'participants.isActive': true,
        status: 'active'
      })
      .populate('participants.userId', 'name email profilePicture')
      .populate('lastMessage.senderId', 'name profilePicture')
      .sort({ 'lastMessage.timestamp': -1 });

      return chats.map(chat => this._formatChatResponse(chat, userId));

    } catch (error) {
      logger.error(`Error al obtener chats por mascota ${petId}:`, error);
      throw error;
    }
  }

  // Métodos privados

  _validateChatCreation({ chatType, participants, createdBy }) {
    if (!chatType || !participants || !createdBy) {
      throw new Error('Datos requeridos faltantes para crear el chat');
    }

    if (!['pet_owner', 'pet_finder', 'direct', 'group'].includes(chatType)) {
      throw new Error('Tipo de chat inválido');
    }
  }

  async _validateParticipants(participantIds) {
    const users = await UserModel.find({
      _id: { $in: participantIds }
    }).select('_id name email profilePicture');

    if (users.length !== participantIds.length) {
      throw new Error('Algunos participantes no existen');
    }

    return users;
  }

  async _validatePet(petId) {
    validateObjectId(petId, 'petId');
    const pet = await PetModel.findById(petId);
    if (!pet) {
      throw new Error('Mascota no encontrada');
    }
    return pet;
  }

  async _createNewChatDocument(chatData) {
    const {
      chatType,
      participants,
      petId,
      title,
      createdBy,
      source = 'direct_message'
    } = chatData;

    this._validateChatCreation({ chatType, participants, createdBy });

    const validParticipants = await this._validateParticipants(participants);
    
    if (petId) {
      await this._validatePet(petId);
    }

    const participantsForChat = validParticipants.map(p => ({
      userId: p._id,
      role: p._id.toString() === createdBy.toString() ? 'owner' : 'participant',
      joinedAt: new Date(),
      isActive: true
    }));

    const chat = new ChatModel({
      chatType,
      petId: petId || null,
      title: title || this._generateChatTitle(chatType, validParticipants),
      participants: participantsForChat,
      metadata: { createdBy, source },
      settings: {
        maxParticipants: chatType === 'group' ? 100 : 2
      }
    });

    await chat.save();
    await this._notifyParticipants(chat, 'chat_created', createdBy);
    await chat.populate('participants.userId', 'name email profilePicture');

    return chat;
  }

  _processMessage(messageData) {
    const { content, messageType = 'text', attachments, location } = messageData;

    if (!content || content.trim().length === 0) {
      throw new Error('El contenido del mensaje no puede estar vacío');
    }

    const sanitizedContent = sanitizeInput(content);
    
    if (sanitizedContent.length > 2000) {
      throw new Error('El mensaje es demasiado largo');
    }

    return {
      content: sanitizedContent,
      messageType,
      attachments: attachments || [],
      location: location || null
    };
  }

  _buildChatsQuery(userId, { status, chatType, search }) {
    const query = {
      'participants.userId': userId,
      'participants.isActive': true,
      status
    };

    if (chatType) {
      query.chatType = chatType;
    }

    if (search) {
      query.$text = { $search: sanitizeInput(search) };
    }

    return query;
  }

  _generateChatTitle(chatType, participants) {
    switch (chatType) {
      case 'pet_owner':
        return 'Chat sobre mascota';
      case 'pet_finder':
        return 'Mascota encontrada';
      case 'direct':
        return participants.map(p => p.name).join(', ');
      default:
        return 'Chat';
    }
  }

  _formatChatResponse(chat, userId) {
    const otherParticipants = chat.participants.filter(p => 
      p.userId._id.toString() !== userId.toString()
    );

    const userParticipant = chat.participants.find(p => 
      p.userId._id.toString() === userId.toString()
    );

    const unreadCount = userParticipant?.lastRead 
      ? chat.messages.filter(m => 
          m.timestamp > userParticipant.lastRead && 
          m.senderId.toString() !== userId.toString() &&
          !m.isDeleted
        ).length
      : chat.messages.filter(m => !m.isDeleted).length;

    return {
      _id: chat._id,
      chatType: chat.chatType,
      title: chat.title,
      petId: chat.petId?._id,
      petName: chat.petId?.name,
      otherParticipants: otherParticipants.map(p => ({
        _id: p.userId._id,
        name: p.userId.name,
        email: p.userId.email,
        profilePicture: p.userId.profilePicture,
        lastSeen: p.lastSeen,
        isActive: p.isActive
      })),
      lastMessage: chat.lastMessage,
      unreadCount,
      stats: chat.stats,
      status: chat.status,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt
    };
  }

  async _notifyNewMessage(chat, message, senderId) {
    const otherParticipants = chat.participants
      .filter(p => p.userId.toString() !== senderId.toString() && p.isActive)
      .map(p => p.userId.toString());

    for (const participantId of otherParticipants) {
      socketService.sendDirectMessage(participantId, 'new_message', {
        chatId: chat._id,
        message: {
          _id: message._id,
          senderId: message.senderId,
          content: message.content,
          messageType: message.messageType,
          timestamp: message.timestamp,
          attachments: message.attachments,
          location: message.location
        }
      });
    }
  }

  async _notifyParticipants(chat, eventType, excludeUserId) {
    const otherParticipants = chat.participants
      .filter(p => p.userId.toString() !== excludeUserId.toString())
      .map(p => p.userId.toString());

    for (const participantId of otherParticipants) {
      if (eventType === 'chat_created') {
        const formattedChat = this._formatChatResponse(chat, participantId);
        socketService.sendDirectMessage(participantId, eventType, formattedChat);
      } else {
        socketService.sendDirectMessage(participantId, eventType, {
          chatId: chat._id,
          chatType: chat.chatType,
          title: chat.title,
          petName: chat.petId?.name
        });
      }
    }
  }

  async _notifyReadStatus(chat, userId) {
    const otherParticipants = chat.participants
      .filter(p => p.userId.toString() !== userId.toString() && p.isActive)
      .map(p => p.userId.toString());

    for (const participantId of otherParticipants) {
      socketService.sendDirectMessage(participantId, 'messages_read', {
        chatId: chat._id,
        readBy: userId,
        readAt: new Date()
      });
    }
  }

  async _updateParticipantActivity(chat, userId) {
    const participant = chat.participants.find(p => 
      p.userId.toString() === userId.toString()
    );
    
    if (participant) {
      participant.lastSeen = new Date();
    }
  }
}

module.exports = new ChatServiceV2(); 