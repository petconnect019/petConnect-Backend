const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  attachments: [{
    type: String,
    url: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Índices para búsqueda eficiente
chatMessageSchema.index({ chatId: 1, createdAt: 1 });
chatMessageSchema.index({ sender: 1 });

const ChatMessageModel = mongoose.model('ChatMessage', chatMessageSchema);

module.exports = ChatMessageModel; 