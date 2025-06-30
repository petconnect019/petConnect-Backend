const mongoose = require('mongoose');

// Schema para mensajes individuales
const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: [2000, 'El mensaje no puede exceder 2000 caracteres']
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'location', 'system'],
    default: 'text'
  },
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'file', 'video', 'audio']
    },
    url: {
      type: String,
      required: true
    },
    name: String,
    size: Number,
    mimeType: String
  }],
  location: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    },
    address: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  editedAt: {
    type: Date,
    default: null
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  deliveredAt: {
    type: Date,
    default: null
  },
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: {
      type: String,
      maxlength: 10
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  _id: true,
  timestamps: false
});

// Schema para participantes
const participantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastRead: {
    type: Date,
    default: null
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  role: {
    type: String,
    enum: ['owner', 'participant', 'admin'],
    default: 'participant'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notifications: {
    enabled: {
      type: Boolean,
      default: true
    },
    sound: {
      type: Boolean,
      default: true
    }
  }
}, {
  _id: false
});

// Schema principal del chat
const chatSchema = new mongoose.Schema({
  // Información básica del chat
  chatType: {
    type: String,
    enum: ['pet_owner', 'pet_finder', 'direct', 'group'],
    required: true,
    default: 'direct'
  },
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'El título no puede exceder 100 caracteres']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres']
  },
  
  // Referencia a mascota (si aplica)
  petId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
    required: false,
    index: true
  },
  
  // Participantes del chat
  participants: [participantSchema],
  
  // Mensajes del chat
  messages: [messageSchema],
  
  // Último mensaje (para optimización de consultas)
  lastMessage: {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    timestamp: Date,
    messageType: {
      type: String,
      default: 'text'
    }
  },
  
  // Configuración del chat
  settings: {
    isPrivate: {
      type: Boolean,
      default: true
    },
    allowInvites: {
      type: Boolean,
      default: false
    },
    maxParticipants: {
      type: Number,
      default: 2,
      min: 2,
      max: 100
    },
    autoDelete: {
      enabled: {
        type: Boolean,
        default: false
      },
      days: {
        type: Number,
        min: 1,
        max: 365
      }
    }
  },
  
  // Estadísticas
  stats: {
    totalMessages: {
      type: Number,
      default: 0
    },
    totalParticipants: {
      type: Number,
      default: 0
    },
    lastActivity: {
      type: Date,
      default: Date.now
    }
  },
  
  // Estado del chat
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted', 'blocked'],
    default: 'active'
  },
  
  // Metadatos
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    source: {
      type: String,
      enum: ['qr_scan', 'pet_profile', 'direct_message', 'system'],
      default: 'direct_message'
    },
    tags: [String]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices compuestos para optimización
chatSchema.index({ 'participants.userId': 1, status: 1, updatedAt: -1 });
chatSchema.index({ petId: 1, chatType: 1 });
chatSchema.index({ 'lastMessage.timestamp': -1 });
chatSchema.index({ 'messages.timestamp': -1 });
chatSchema.index({ 'messages.senderId': 1 });

// Índices de texto para búsqueda
chatSchema.index({ 
  title: 'text', 
  description: 'text', 
  'messages.content': 'text' 
});

// Virtual para obtener participantes activos
chatSchema.virtual('activeParticipants').get(function() {
  return this.participants.filter(p => p.isActive);
});

// Virtual para obtener mensajes no eliminados
chatSchema.virtual('activeMessages').get(function() {
  return this.messages.filter(m => !m.isDeleted);
});

// Middleware pre-save para actualizar estadísticas
chatSchema.pre('save', function(next) {
  // Actualizar contador de mensajes
  this.stats.totalMessages = this.messages.filter(m => !m.isDeleted).length;
  
  // Actualizar contador de participantes activos
  this.stats.totalParticipants = this.participants.filter(p => p.isActive).length;
  
  // Actualizar última actividad
  this.stats.lastActivity = new Date();
  
  // Actualizar último mensaje
  const lastMessage = this.messages
    .filter(m => !m.isDeleted)
    .sort((a, b) => b.timestamp - a.timestamp)[0];
  
  if (lastMessage) {
    this.lastMessage = {
      senderId: lastMessage.senderId,
      content: lastMessage.content,
      timestamp: lastMessage.timestamp,
      messageType: lastMessage.messageType
    };
  }
  
  next();
});

// Método para agregar participante
chatSchema.methods.addParticipant = function(userId, role = 'participant') {
  const existingParticipant = this.participants.find(p => 
    p.userId.toString() === userId.toString()
  );
  
  if (existingParticipant) {
    existingParticipant.isActive = true;
    existingParticipant.role = role;
    return existingParticipant;
  }
  
  const newParticipant = {
    userId,
    role,
    joinedAt: new Date(),
    isActive: true
  };
  
  this.participants.push(newParticipant);
  return newParticipant;
};

// Método para remover participante
chatSchema.methods.removeParticipant = function(userId) {
  const participant = this.participants.find(p => 
    p.userId.toString() === userId.toString()
  );
  
  if (participant) {
    participant.isActive = false;
    return true;
  }
  
  return false;
};

// Método para verificar si un usuario es participante
chatSchema.methods.isParticipant = function(userId) {
  // Debug detallado para diagnosticar el problema
  console.log('🔍 DEBUG isParticipant - Verificando permisos:');
  console.log(`   UserID buscado: ${userId} (tipo: ${typeof userId})`);
  console.log(`   Participantes en chat: ${JSON.stringify(this.participants.map(p => ({
    userId: p.userId.toString(),
    isActive: p.isActive,
    role: p.role
  })))}`);
  
  const found = this.participants.some(p => {
    const participantId = p.userId.toString();
    const searchId = userId.toString();
    const isActive = p.isActive;
    
    console.log(`   Comparando: "${participantId}" === "${searchId}" && isActive: ${isActive}`);
    
    return participantId === searchId && isActive;
  });
  
  console.log(`   🎯 Resultado: ${found}`);
  return found;
};

// Método para agregar mensaje
chatSchema.methods.addMessage = function(messageData) {
  const message = {
    ...messageData,
    timestamp: new Date(),
    _id: new mongoose.Types.ObjectId()
  };
  
  this.messages.push(message);
  return message;
};

// Método para marcar mensajes como leídos
chatSchema.methods.markAsRead = function(userId, messageIds = null) {
  const messages = messageIds 
    ? this.messages.filter(m => messageIds.includes(m._id.toString()))
    : this.messages;
  
  messages.forEach(message => {
    const existingRead = message.readBy.find(r => 
      r.userId.toString() === userId.toString()
    );
    
    if (!existingRead) {
      message.readBy.push({
        userId,
        readAt: new Date()
      });
    }
  });
  
  // Actualizar lastRead del participante
  const participant = this.participants.find(p => 
    p.userId.toString() === userId.toString()
  );
  
  if (participant) {
    participant.lastRead = new Date();
  }
  
  return this;
};

// Método estático para buscar chats por usuario
chatSchema.statics.findByUser = function(userId, options = {}) {
  const {
    status = 'active',
    limit = 50,
    skip = 0,
    populate = true
  } = options;
  
  let query = this.find({
    'participants.userId': userId,
    'participants.isActive': true,
    status
  })
  .sort({ 'lastMessage.timestamp': -1 })
  .limit(limit)
  .skip(skip);
  
  if (populate) {
    query = query
      .populate('participants.userId', 'name email profilePicture')
      .populate('petId', 'name photos')
      .populate('lastMessage.senderId', 'name profilePicture');
  }
  
  return query;
};

// Método estático para buscar chat entre usuarios específicos
chatSchema.statics.findBetweenUsers = function(userId1, userId2, petId = null) {
  const query = {
    $and: [
      { 'participants.userId': userId1 },
      { 'participants.userId': userId2 },
      { status: 'active' }
    ]
  };
  
  if (petId) {
    query.petId = petId;
  }
  
  return this.findOne(query);
};

const ChatModel = mongoose.model('Chat', chatSchema);

module.exports = ChatModel; 