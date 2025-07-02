const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['security', 'system', 'pet_scan', 'message', 'health', 'reminder'],
    index: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  expiresAt: {
    type: Date,
    index: true,
    expires: 0 // TTL index - el documento se eliminará cuando llegue a esta fecha
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Índice compuesto para consultas comunes
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

const NotificationModel = mongoose.model('Notification', notificationSchema);

module.exports = NotificationModel; 