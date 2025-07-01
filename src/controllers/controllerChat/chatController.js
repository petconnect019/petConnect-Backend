const chatService = require('../../services/chatService');
const logger = require('../../utils/logger');
const { validatePagination, validateSearchQuery } = require('../../utils/validation');

/**
 * Controlador profesional para manejo de chats
 * Utiliza el servicio de chat para la lógica de negocio
 */
const chatController = {

  /**
   * Obtener todos los chats del usuario con paginación y filtros
   * GET /api/chat?page=1&limit=20&search=texto&chatType=direct
   */
  async getUserChats(req, res) {
    try {
      const userId = req.user.id;
      const { page, limit, search, chatType, status } = req.query;
      
      // Validar y sanitizar parámetros
      const pagination = validatePagination({ page, limit });
      const searchQuery = validateSearchQuery(search);
      
      const options = {
        ...pagination,
        search: searchQuery,
        chatType,
        status: status || 'active'
      };

      const result = await chatService.getUserChats(userId, options);

      logger.info(`Chats obtenidos para usuario ${userId}: ${result.chats.length} chats`);

      res.json({
        success: true,
        message: 'Chats obtenidos exitosamente',
        data: result.chats,
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Error al obtener chats del usuario:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  },

  /**
   * Obtener mensajes de un chat específico con paginación
   * GET /api/chat/:chatId/messages?page=1&limit=50&before=2024-01-01T00:00:00.000Z
   */
  async getChatMessages(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user.id;
      const { page, limit, before } = req.query;

      // Validar paginación
      const pagination = validatePagination({ page, limit });

      const options = {
        ...pagination,
        before
      };

      const result = await chatService.getChatMessages(chatId, userId, options);

      logger.info(`Mensajes obtenidos del chat ${chatId} para usuario ${userId}`);

      res.json({
        success: true,
        message: 'Mensajes obtenidos exitosamente',
        data: result.messages,
        pagination: result.pagination
      });

    } catch (error) {
      logger.error(`Error al obtener mensajes del chat ${req.params.chatId}:`, error);
      
      let statusCode = 500;
      if (error.message.includes('no encontrado')) {
        statusCode = 404;
      } else if (error.message.includes('permisos') || error.message.includes('acceder')) {
        statusCode = 403;
      } else if (error.message.includes('válido')) {
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  /**
   * Enviar mensaje en un chat
   * POST /api/chat/:chatId/messages
   */
  async sendMessage(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user.id;
      const messageData = req.body;

      const sentMessage = await chatService.sendMessage(chatId, userId, messageData);

      logger.info(`Mensaje enviado en chat ${chatId} por usuario ${userId}`);

      res.status(201).json({
        success: true,
        message: 'Mensaje enviado exitosamente',
        data: sentMessage
      });

    } catch (error) {
      logger.error(`Error al enviar mensaje en chat ${req.params.chatId}:`, error);
      
      let statusCode = 500;
      if (error.message.includes('no encontrado')) {
        statusCode = 404;
      } else if (error.message.includes('permisos') || error.message.includes('acceder')) {
        statusCode = 403;
      } else if (error.message.includes('vacío') || error.message.includes('inválido') || error.message.includes('largo')) {
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  /**
   * Obtener un chat específico por ID
   * GET /api/chat/:chatId
   */
  async getChatById(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user.id;

      const chat = await chatService.getChatById(chatId, userId);

      logger.info(`Chat ${chatId} obtenido por usuario ${userId}`);

      res.json({
        success: true,
        message: 'Chat obtenido exitosamente',
        data: chat
      });

    } catch (error) {
      logger.error(`Error al obtener chat ${req.params.chatId}:`, error);
      
      let statusCode = 500;
      if (error.message.includes('no encontrado')) {
        statusCode = 404;
      } else if (error.message.includes('permisos')) {
        statusCode = 403;
      } else if (error.message.includes('válido')) {
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  /**
   * Iniciar chat con el dueño de una mascota
   * POST /api/chat/pet/:petId/start
   */
  async startChatWithPetOwner(req, res) {
    try {
      const { petId } = req.params;
      const userId = req.user.id;

      const chat = await chatService.startChatWithPetOwner(userId, petId);

      logger.info(`Chat iniciado con dueño de mascota ${petId} por usuario ${userId}`);

      res.status(201).json({
        success: true,
        message: 'Chat iniciado exitosamente',
        data: chat
      });

    } catch (error) {
      logger.error('Error al iniciar chat con dueño de mascota:', error);
      
      let statusCode = 500;
      if (error.message.includes('no encontrada')) {
        statusCode = 404;
      } else if (error.message.includes('contigo mismo')) {
        statusCode = 400;
      } else if (error.message.includes('válido')) {
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  /**
   * Crear un nuevo chat
   * POST /api/chat
   */
  async createChat(req, res) {
    try {
      const userId = req.user.id;
      const chatData = {
        ...req.body,
        createdBy: userId
      };

      const chat = await chatService.createChat(chatData);

      logger.info(`Chat creado: ${chat._id} por usuario ${userId}`);

      res.status(201).json({
        success: true,
        message: 'Chat creado exitosamente',
        data: chat
      });

    } catch (error) {
      logger.error('Error al crear chat:', error);
      
      let statusCode = 500;
      if (error.message.includes('requeridos') || error.message.includes('inválido')) {
        statusCode = 400;
      } else if (error.message.includes('no encontrado')) {
        statusCode = 404;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  /**
   * Marcar mensajes como leídos
   * POST /api/chat/:chatId/read
   */
  async markMessagesAsRead(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user.id;
      const { messageIds } = req.body;

      const result = await chatService.markMessagesAsRead(chatId, userId, messageIds);

      logger.info(`Mensajes marcados como leídos en chat ${chatId} por usuario ${userId}`);

      res.json({
        success: true,
        message: 'Mensajes marcados como leídos',
        data: result
      });

    } catch (error) {
      logger.error(`Error al marcar mensajes como leídos:`, error);
      
      let statusCode = 500;
      if (error.message.includes('no encontrado')) {
        statusCode = 404;
      } else if (error.message.includes('permisos')) {
        statusCode = 403;
      } else if (error.message.includes('válido')) {
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  /**
   * Archivar un chat
   * PUT /api/chat/:chatId/archive
   */
  async archiveChat(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user.id;

      const result = await chatService.archiveChat(chatId, userId);

      logger.info(`Chat ${chatId} archivado por usuario ${userId}`);

      res.json({
        success: true,
        message: 'Chat archivado exitosamente',
        data: result
      });

    } catch (error) {
      logger.error(`Error al archivar chat ${req.params.chatId}:`, error);
      
      let statusCode = 500;
      if (error.message.includes('no encontrado')) {
        statusCode = 404;
      } else if (error.message.includes('permisos')) {
        statusCode = 403;
      } else if (error.message.includes('válido')) {
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  /**
   * Obtener chats relacionados con una mascota
   * GET /api/chat/pet/:petId
   */
  async getChatsByPet(req, res) {
    try {
      const { petId } = req.params;
      const userId = req.user.id;

      const chats = await chatService.getChatsByPet(petId, userId);

      logger.info(`Chats obtenidos para mascota ${petId} por usuario ${userId}`);

      res.json({
        success: true,
        message: 'Chats obtenidos exitosamente',
        data: chats
      });

    } catch (error) {
      logger.error(`Error al obtener chats por mascota ${req.params.petId}:`, error);
      
      let statusCode = 500;
      if (error.message.includes('no encontrada')) {
        statusCode = 404;
      } else if (error.message.includes('válido')) {
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  /**
   * Iniciar chat con un usuario específico
   * POST /api/chat/user/:recipientId/start
   */
  async startChatWithUser(req, res) {
    try {
      console.log('🚀 DEBUG: startChatWithUser INICIO');
      console.log('   req.user:', req.user);
      console.log('   req.params:', req.params);
      console.log('   req.body:', req.body);
      
      const { recipientId } = req.params;
      const { initialMessage } = req.body;
      const senderId = req.user.id;

      // Debug logging
      logger.info(`📨 Iniciando chat entre usuarios:`);
      logger.info(`   Sender ID: ${senderId}`);
      logger.info(`   Recipient ID: ${recipientId}`);
      logger.info(`   Mensaje inicial: "${initialMessage}"`);

      // Validar mensaje inicial
      if (!initialMessage || initialMessage.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'El mensaje inicial es requerido'
        });
      }

      // Crear chat directo
      const chatData = {
        chatType: 'direct',
        participants: [senderId, recipientId],
        createdBy: senderId,
        source: 'direct_message'
      };

      logger.info(`📋 Datos del chat a crear: ${JSON.stringify(chatData)}`);

      const chatDocument = await chatService.createChatDocument(chatData);
      
      logger.info(`✅ Chat creado exitosamente, enviando mensaje inicial...`);
      logger.info(`   Chat ID obtenido: ${chatDocument._id}`);

      // Enviar mensaje usando el documento directamente
      await chatService.sendMessage(chatDocument._id, senderId, {
        content: initialMessage.trim(),
        messageType: 'text'
      });

      // Obtener chat formateado para la respuesta
      const formattedChat = await chatService.getChatById(chatDocument._id, senderId);

      logger.info(`Chat iniciado entre usuarios ${senderId} y ${recipientId}`);

      res.status(201).json({
        success: true,
        message: 'Chat iniciado y mensaje enviado exitosamente',
        chat: formattedChat // Retornar chat completo formateado
      });

    } catch (error) {
      logger.error('Error al iniciar chat con usuario:', error);
      
      let statusCode = 500;
      if (error.message.includes('no existe')) {
        statusCode = 404;
      } else if (error.message.includes('contigo mismo') || error.message.includes('requerido')) {
        statusCode = 400;
      } else if (error.message.includes('válido')) {
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
};

module.exports = chatController; 