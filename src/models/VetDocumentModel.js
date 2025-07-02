const mongoose = require('mongoose');

const vetDocumentSchema = new mongoose.Schema({
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
        enum: ['vaccine', 'medical', 'passport', 'prescription', 'lab', 'surgery'],
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        required: true
    },
    nextDue: {
        type: Date,
        default: null
    },
    veterinary: {
        type: String,
        trim: true,
        default: ''
    },
    notes: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'pending', 'completed'],
        default: 'completed'
    },
    fileUrl: {
        type: String,
        default: null
    },
    fileName: {
        type: String,
        default: null
    },
    fileSize: {
        type: Number,
        default: null
    },
    mimeType: {
        type: String,
        default: null
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

// Virtual para calcular si está vencido
vetDocumentSchema.virtual('isExpired').get(function() {
    if (!this.nextDue) return false;
    return new Date() > new Date(this.nextDue);
});

// Virtual para días restantes hasta vencimiento
vetDocumentSchema.virtual('daysUntilExpiration').get(function() {
    if (!this.nextDue) return null;
    const today = new Date();
    const dueDate = new Date(this.nextDue);
    const diffTime = dueDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Índices para optimizar consultas
vetDocumentSchema.index({ petId: 1, type: 1 });
vetDocumentSchema.index({ ownerId: 1 });
vetDocumentSchema.index({ date: -1 });
vetDocumentSchema.index({ nextDue: 1 });

const VetDocumentModel = mongoose.model('VetDocument', vetDocumentSchema);

module.exports = VetDocumentModel; 