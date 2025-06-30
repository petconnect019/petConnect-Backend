const express = require('express');
const router = express.Router();
const chatController = require('../controllers/controllerChat/chatController');
const { verifyToken } = require('../middlewares/authMiddleware');
const { body, param, query } = require('express-validator');
const { handleValidationErrors } = require('../middlewares/validationMiddleware');

// Todas las rutas de chat requieren autenticación
router.use(verifyToken);

// Validaciones comunes
const chatIdValidation = [
  param('chatId').isMongoId().withMessage('ID de chat inválido')
];

const petIdValidation = [
  param('petId').isMongoId().withMessage('ID de mascota inválido')
];

const recipientIdValidation = [
  param('recipientId').isMongoId().withMessage('ID de destinatario inválido')
];

const messageValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('El mensaje debe tener entre 1 y 2000 caracteres'),
  body('messageType')
    .optional()
    .isIn(['text', 'image', 'file', 'location', 'system'])
    .withMessage('Tipo de mensaje inválido'),
  body('attachments')
    .optional()
    .isArray()
    .withMessage('Los adjuntos deben ser un array')
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero mayor a 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un número entre 1 y 100'),
  query('search')
    .optional()
    .isLength({ max: 100 })
    .withMessage('La búsqueda no puede exceder 100 caracteres')
];

// === RUTAS PRINCIPALES ===

// Obtener todos los chats del usuario con paginación y filtros
router.get('/', 
  paginationValidation,
  handleValidationErrors,
  chatController.getUserChats
);

// Crear un nuevo chat
router.post('/',
  [
    body('chatType')
      .isIn(['pet_owner', 'pet_finder', 'direct', 'group'])
      .withMessage('Tipo de chat inválido'),
    body('participants')
      .isArray({ min: 1 })
      .withMessage('Debe incluir al menos un participante'),
    body('participants.*')
      .isMongoId()
      .withMessage('IDs de participantes inválidos'),
    body('title')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('El título debe tener entre 1 y 100 caracteres'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('La descripción no puede exceder 500 caracteres')
  ],
  handleValidationErrors,
  chatController.createChat
);

// === RUTAS DE CHAT DIRECTO ENTRE USUARIOS (ANTES DE RUTAS GENÉRICAS) ===

// Iniciar chat con un usuario específico y enviar mensaje inicial
router.post('/user/:recipientId/start',
  [
    ...recipientIdValidation,
    body('initialMessage')
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('El mensaje inicial debe tener entre 1 y 2000 caracteres')
  ],
  handleValidationErrors,
  chatController.startChatWithUser
);

// === RUTAS DE CHAT ESPECÍFICO ===

// Obtener un chat específico por ID
router.get('/:chatId',
  chatIdValidation,
  handleValidationErrors,
  chatController.getChatById
);

// Archivar un chat
router.put('/:chatId/archive',
  chatIdValidation,
  handleValidationErrors,
  chatController.archiveChat
);

// === RUTAS DE MENSAJES ===

// Obtener mensajes de un chat con paginación
router.get('/:chatId/messages',
  [
    ...chatIdValidation,
    ...paginationValidation,
    query('before')
      .optional()
      .isISO8601()
      .withMessage('La fecha debe estar en formato ISO8601')
  ],
  handleValidationErrors,
  chatController.getChatMessages
);

// Enviar mensaje en un chat
router.post('/:chatId/messages',
  [
    ...chatIdValidation,
    ...messageValidation
  ],
  handleValidationErrors,
  chatController.sendMessage
);

// Marcar mensajes como leídos
router.post('/:chatId/read',
  [
    ...chatIdValidation,
    body('messageIds')
      .optional()
      .isArray()
      .withMessage('Los IDs de mensajes deben ser un array'),
    body('messageIds.*')
      .optional()
      .isMongoId()
      .withMessage('IDs de mensajes inválidos')
  ],
  handleValidationErrors,
  chatController.markMessagesAsRead
);

// === RUTAS ESPECÍFICAS DE MASCOTAS ===

// Obtener chats relacionados con una mascota
router.get('/pet/:petId',
  petIdValidation,
  handleValidationErrors,
  chatController.getChatsByPet
);

// Iniciar chat con el dueño de una mascota
router.post('/pet/:petId/start',
  petIdValidation,
  handleValidationErrors,
  chatController.startChatWithPetOwner
);

// === RUTAS DE CHAT DIRECTO ENTRE USUARIOS (YA MOVIDA ARRIBA) ===

// === RUTAS DE BÚSQUEDA Y FILTROS ===

// Buscar chats con filtros avanzados
router.get('/search/advanced',
  [
    query('q')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('La consulta de búsqueda debe tener entre 1 y 100 caracteres'),
    query('chatType')
      .optional()
      .isIn(['pet_owner', 'pet_finder', 'direct', 'group'])
      .withMessage('Tipo de chat inválido'),
    query('status')
      .optional()
      .isIn(['active', 'archived', 'deleted', 'blocked'])
      .withMessage('Estado de chat inválido'),
    ...paginationValidation
  ],
  handleValidationErrors,
  chatController.getUserChats
);

// === MIDDLEWARE DE MANEJO DE ERRORES ===

// Middleware para manejar rutas no encontradas en /api/chat
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta ${req.method} ${req.originalUrl} no encontrada`,
    availableRoutes: [
      'GET /api/chat - Obtener chats del usuario',
      'POST /api/chat - Crear nuevo chat',
      'GET /api/chat/:chatId - Obtener chat específico',
      'GET /api/chat/:chatId/messages - Obtener mensajes',
      'POST /api/chat/:chatId/messages - Enviar mensaje',
      'POST /api/chat/:chatId/read - Marcar como leído',
      'PUT /api/chat/:chatId/archive - Archivar chat',
      'GET /api/chat/pet/:petId - Chats por mascota',
      'POST /api/chat/pet/:petId/start - Chat con dueño',
      'POST /api/chat/user/:recipientId/start - Chat directo'
    ]
  });
});

module.exports = router;
// TEST ROUTE