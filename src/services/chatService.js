const ChatModel = require('../models/ChatModel');
const UserModel = require('../models/UserModel');
const PetModel = require('../models/PetModel');
const socketService = require('./socketService');
const logger = require('../utils/logger');
const { validateObjectId, sanitizeInput } = require('../utils/validation');

/**
 * Servicio profesional para manejo de chats
 * Encapsula toda la lógica de negocio del sistema de chat
 */
class ChatService {
  
  /**
   * Crear un nuevo chat
   * @param {Object} chatData - Datos del chat
   * @param {string} chatData.chatType - Tipo de chat
   * @param {Array} chatData.participants - IDs de participantes
   * @param {string} [chatData.petId] - ID de mascota (opcional)
   * @param {string} [chatData.title] - Título del chat
   * @param {string} chatData.createdBy - ID del creador
   * @returns {Promise<Object>} Chat creado
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

      // Validaciones
      if (!chatType || !participants || !createdBy) {
        throw new Error('Datos requeridos faltantes para crear el chat');
      }

      if (!['pet_owner', 'pet_finder', 'direct', 'group'].includes(chatType)) {
        throw new Error('Tipo de chat inválido');
      }

      // Verificar que los participantes existan
      const validParticipants = await this._validateParticipants(participants);
      
      // Si hay petId, verificar que exista
      if (petId) {
        validateObjectId(petId, 'petId');
        const pet = await PetModel.findById(petId);
        if (!pet) {
          throw new Error('Mascota no encontrada');
        }
      }

      // Debug: Log de creación de chat
      logger.info(`🏗️ Creando chat:`);
      logger.info(`   Tipo: ${chatType}`);
      logger.info(`   Creado por: ${createdBy}`);
      logger.info(`   Participantes válidos: ${JSON.stringify(validParticipants.map(p => ({
        _id: p._id.toString(),
        name: p.name
      })))}`);

      // Crear el chat
      const participantsForChat = validParticipants.map(p => ({
        userId: p._id,
        role: p._id.toString() === createdBy.toString() ? 'owner' : 'participant',
        joinedAt: new Date(),
        isActive: true
      }));

      logger.info(`   Participantes del chat: ${JSON.stringify(participantsForChat.map(p => ({
        userId: p.userId.toString(),
        role: p.role,
        isActive: p.isActive
      })))}`);

      const chat = new ChatModel({
        chatType,
        petId: petId || null,
        title: title || this._generateChatTitle(chatType, validParticipants),
        participants: participantsForChat,
        metadata: {
          createdBy,
          source
        },
        settings: {
          maxParticipants: chatType === 'group' ? 100 : 2
        }
      });

      await chat.save();
      
      logger.info(`✅ Chat guardado con ID: ${chat._id}`);

      // Notificar a los participantes (excepto al creador)
      await this._notifyParticipants(chat, 'chat_created', createdBy);

      logger.info(`Chat creado: ${chat._id} por usuario ${createdBy}`);
      return await this.getChatById(chat._id, createdBy);

    } catch (error) {
      logger.error('Error al crear chat:', error);
      throw error;
    }
  }

  /**
   * Crear chat y retornar documento de MongoDB (para uso interno)
   * @param {Object} chatData - Datos del chat a crear
   * @returns {Promise<Object>} Documento de chat de MongoDB
   */
  async createChatDocument(chatData) {
    try {
      const {
        chatType,
        participants,
        petId,
        title,
        createdBy,
        source = 'direct_message'
      } = chatData;

      // --- INICIO DE LÓGICA IDEMPOTENTE ---
      // Si es un chat directo, buscar si ya existe
      if (chatType === 'direct' && participants.length === 2) {
        logger.info(`🔎 Buscando chat 'direct' existente entre: ${participants.join(' y ')}`);
        const existingChat = await ChatModel.findOne({
          chatType: 'direct',
          'participants.userId': { $all: participants },
          'participants': { $size: 2 }
        });

        if (existingChat) {
          logger.info(`✅ Chat 'direct' existente encontrado: ${existingChat._id}`);
          return existingChat; // Retornar el chat existente
        }
        logger.info(`🤷‍♂️ No se encontró chat 'direct' existente. Creando uno nuevo.`);
      }
      // --- FIN DE LÓGICA IDEMPOTENTE ---

      // Validaciones
      if (!chatType || !participants || !createdBy) {
        throw new Error('Datos requeridos faltantes para crear el chat');
      }

      if (!['pet_owner', 'pet_finder', 'direct', 'group'].includes(chatType)) {
        throw new Error('Tipo de chat inválido');
      }

      // Verificar que los participantes existan
      const validParticipants = await this._validateParticipants(participants);
      
      // Si hay petId, verificar que exista
      if (petId) {
        validateObjectId(petId, 'petId');
        const pet = await PetModel.findById(petId);
        if (!pet) {
          throw new Error('Mascota no encontrada');
        }
      }

      // Crear el chat
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
        metadata: {
          createdBy,
          source
        },
        settings: {
          maxParticipants: chatType === 'group' ? 100 : 2
        }
      });

      await chat.save();
      
      // Notificar a los participantes (excepto al creador)
      await this._notifyParticipants(chat, 'chat_created', createdBy);

      logger.info(`Chat creado: ${chat._id} por usuario ${createdBy}`);
      return chat; // Retornar documento directamente

    } catch (error) {
      logger.error('Error al crear chat document:', error);
      throw error;
    }
  }

  /**
   * Obtener chat por ID con verificación de permisos
   * @param {string} chatId - ID del chat
   * @param {string} userId - ID del usuario que solicita
   * @returns {Promise<Object>} Datos del chat
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

      // Verificar permisos
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
   * Obtener todos los chats de un usuario
   * @param {string} userId - ID del usuario
   * @param {Object} options - Opciones de paginación y filtros
   * @returns {Promise<Object>} Lista de chats paginada
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
      let query = {
        'participants.userId': userId,
        'participants.isActive': true,
        status
      };

      if (chatType) {
        query.chatType = chatType;
      }

      // Agregar búsqueda de texto si existe
      if (search) {
        query.$text = { $search: sanitizeInput(search) };
      }

      // Ejecutar consulta con paginación
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

      // Formatear respuesta
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
   * Enviar mensaje en un chat
   * @param {string} chatId - ID del chat
   * @param {string} senderId - ID del remitente
   * @param {Object} messageData - Datos del mensaje
   * @returns {Promise<Object>} Mensaje enviado
   */
  async sendMessage(chatId, senderId, messageData) {
    try {
      validateObjectId(chatId, 'chatId');
      validateObjectId(senderId, 'senderId');

      const { content, messageType = 'text', attachments, location } = messageData;

      // Validaciones
      if (!content || content.trim().length === 0) {
        throw new Error('El contenido del mensaje no puede estar vacío');
      }

      const sanitizedContent = sanitizeInput(content);
      
      if (sanitizedContent.length > 2000) {
        throw new Error('El mensaje es demasiado largo');
      }

      // Obtener chat y verificar permisos
      const chat = await ChatModel.findById(chatId);
      if (!chat) {
        throw new Error('Chat no encontrado');
      }

      // Debug: Log detallado de participantes
      logger.info(`🔍 Verificando permisos para enviar mensaje:`);
      logger.info(`   Chat ID: ${chatId}`);
      logger.info(`   Sender ID: ${senderId}`);
      logger.info(`   Participantes en chat: ${JSON.stringify(chat.participants.map(p => ({
        userId: p.userId.toString(),
        isActive: p.isActive,
        role: p.role
      })))}`);
      
      const isParticipant = chat.isParticipant(senderId);
      logger.info(`   ¿Es participante? ${isParticipant}`);

      if (!isParticipant) {
        throw new Error('No tienes permisos para acceder a este chat');
      }

      if (chat.status !== 'active') {
        throw new Error('No se pueden enviar mensajes en un chat inactivo');
      }

      // Crear mensaje
      const message = chat.addMessage({
        senderId,
        content: sanitizedContent,
        messageType,
        attachments: attachments || [],
        location: location || null
      });

      // Guardar chat
      await chat.save();

      // Obtener mensaje poblado
      await chat.populate('messages.senderId', 'name profilePicture');
      const populatedMessage = chat.messages.id(message._id);

      // Notificar a otros participantes
      await this._notifyNewMessage(chat, populatedMessage, senderId);

      // Actualizar última actividad de los participantes
      await this._updateParticipantActivity(chat, senderId);

      logger.info(`Mensaje enviado en chat ${chatId} por usuario ${senderId}`);
      return populatedMessage;

    } catch (error) {
      logger.error(`Error al enviar mensaje en chat ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Marcar mensajes como leídos
   * @param {string} chatId - ID del chat
   * @param {string} userId - ID del usuario
   * @param {Array} [messageIds] - IDs específicos de mensajes (opcional)
   * @returns {Promise<Object>} Resultado de la operación
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

      // Marcar mensajes como leídos
      chat.markAsRead(userId, messageIds);
      await chat.save();

      // Notificar a otros participantes sobre el estado de lectura
      await this._notifyReadStatus(chat, userId);

      logger.info(`Mensajes marcados como leídos en chat ${chatId} por usuario ${userId}`);
      return { success: true, readAt: new Date() };

    } catch (error) {
      logger.error(`Error al marcar mensajes como leídos:`, error);
      throw error;
    }
  }

  /**
   * Obtener mensajes de un chat con paginación
   * @param {string} chatId - ID del chat
   * @param {string} userId - ID del usuario
   * @param {Object} options - Opciones de paginación
   * @returns {Promise<Object>} Mensajes paginados
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

      // Filtrar mensajes activos
      let messages = chat.activeMessages;

      // Filtrar por fecha si se especifica
      if (before) {
        messages = messages.filter(m => m.timestamp < new Date(before));
      }

      // Ordenar por timestamp (más recientes primero para paginación)
      messages.sort((a, b) => b.timestamp - a.timestamp);

      // Aplicar paginación
      const skip = (page - 1) * limit;
      const paginatedMessages = messages.slice(skip, skip + limit);

      // Marcar mensajes como leídos automáticamente
      await this.markMessagesAsRead(chatId, userId);

      return {
        messages: paginatedMessages.reverse(), // Revertir para mostrar cronológicamente
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
   * Buscar chats por mascota
   * @param {string} petId - ID de la mascota
   * @param {string} userId - ID del usuario (para verificar permisos)
   * @returns {Promise<Array>} Chats relacionados con la mascota
   */
  async getChatsByPet(petId, userId) {
    try {
      validateObjectId(petId, 'petId');
      validateObjectId(userId, 'userId');

      // Verificar que la mascota existe y el usuario tiene acceso
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

  /**
   * Iniciar chat con dueño de mascota
   * @param {string} userId - ID del usuario que inicia el chat
   * @param {string} petId - ID de la mascota
   * @returns {Promise<Object>} Chat creado o existente
   */
  async startChatWithPetOwner(userId, petId) {
    try {
      validateObjectId(userId, 'userId');
      validateObjectId(petId, 'petId');

      // Verificar que la mascota existe
      const pet = await PetModel.findById(petId).populate('owner');
      if (!pet) {
        throw new Error('Mascota no encontrada');
      }

      // Verificar que el usuario no es el dueño
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
      logger.error(`Error al iniciar chat con dueño de mascota:`, error);
      throw error;
    }
  }

  /**
   * Archivar un chat
   * @param {string} chatId - ID del chat
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Resultado de la operación
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

      logger.info(`Chat ${chatId} archivado por usuario ${userId}`);
      return { success: true, archivedAt: new Date() };

    } catch (error) {
      logger.error(`Error al archivar chat ${chatId}:`, error);
      throw error;
    }
  }

  // Métodos privados para utilidades

  /**
   * Validar que los participantes existan
   * @private
   */
  async _validateParticipants(participantIds) {
    const users = await UserModel.find({
      _id: { $in: participantIds }
    }).select('_id name email profilePicture');

    if (users.length !== participantIds.length) {
      throw new Error('Algunos participantes no existen');
    }

    return users;
  }

  /**
   * Generar título automático para el chat
   * @private
   */
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

  /**
   * Formatear respuesta del chat para el cliente
   * @private
   */
  _formatChatResponse(chat, userId) {
    const otherParticipants = chat.participants.filter(p => 
      p.userId._id.toString() !== userId.toString()
    );

    const userParticipant = chat.participants.find(p => 
      p.userId._id.toString() === userId.toString()
    );

    // Calcular mensajes no leídos
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

  /**
   * Notificar nuevo mensaje a participantes
   * @private
   */
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

  /**
   * Notificar creación de chat a participantes
   * @private
   */
  async _notifyParticipants(chat, eventType, excludeUserId) {
    const otherParticipants = chat.participants
      .filter(p => p.userId.toString() !== excludeUserId.toString())
      .map(p => p.userId.toString());

    for (const participantId of otherParticipants) {
      // Para chat_created, enviar el chat completo formateado
      if (eventType === 'chat_created') {
        const formattedChat = this._formatChatResponse(chat, participantId);
        socketService.sendDirectMessage(participantId, eventType, formattedChat);
      } else {
        // Para otros eventos, enviar datos básicos
        socketService.sendDirectMessage(participantId, eventType, {
          chatId: chat._id,
          chatType: chat.chatType,
          title: chat.title,
          petName: chat.petId?.name
        });
      }
    }
  }

  /**
   * Notificar estado de lectura
   * @private
   */
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

  /**
   * Actualizar actividad del participante
   * @private
   */
  async _updateParticipantActivity(chat, userId) {
    const participant = chat.participants.find(p => 
      p.userId.toString() === userId.toString()
    );
    
    if (participant) {
      participant.lastSeen = new Date();
    }
  }
}

module.exports = new ChatService(); 