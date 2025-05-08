const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  location: {
    type: {
      lat: Number,
      lng: Number
    },
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  }
});

const chatSchema = new mongoose.Schema({
  petId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
    required: true
  },
  owner: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    lastRead: {
      type: Date,
      default: null
    }
  },
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    lastRead: {
      type: Date,
      default: null
    }
  }],
  messages: [messageSchema],
  lastMessage: {
    type: messageSchema,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Actualizar updatedAt antes de guardar
chatSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Índice para búsqueda eficiente de chats por participantes
chatSchema.index({ participants: 1 });

const ChatModel = mongoose.model('Chat', chatSchema);

module.exports = ChatModel; 