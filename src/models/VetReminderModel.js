const mongoose = require('mongoose');

const vetReminderSchema = new mongoose.Schema({
    petId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pet',
        required: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['vaccine', 'checkup', 'medication', 'grooming', 'appointment', 'other'],
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    date: {
        type: Date,
        required: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    completed: {
        type: Boolean,
        default: false
    },
    completedAt: {
        type: Date,
        default: null
    },
    reminderSent: {
        type: Boolean,
        default: false
    },
    reminderDays: {
        type: Number,
        default: 1 // Días antes para recordar
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual para saber si está vencido
vetReminderSchema.virtual('isOverdue').get(function() {
    if (this.completed) return false;
    return new Date() > new Date(this.date);
});

// Virtual para saber si es próximo (dentro de los próximos 3 días)
vetReminderSchema.virtual('isUpcoming').get(function() {
    if (this.completed) return false;
    const today = new Date();
    const reminderDate = new Date(this.date);
    const diffDays = Math.ceil((reminderDate - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
});

// Índices para optimizar consultas
vetReminderSchema.index({ petId: 1, completed: 1 });
vetReminderSchema.index({ ownerId: 1 });
vetReminderSchema.index({ date: 1 });
vetReminderSchema.index({ priority: 1 });

const VetReminderModel = mongoose.model('VetReminder', vetReminderSchema);

module.exports = VetReminderModel; 