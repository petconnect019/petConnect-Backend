const mongoose = require('mongoose');

const qrSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    qrId: {
        type: String,
        required: true,
        unique: true
    },
    qrImage: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'used'],
        default: 'active'
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

// Middleware para actualizar updatedAt antes de guardar
qrSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const QRModel = mongoose.model('QR', qrSchema);

module.exports = QRModel;  