const mongoose = require('mongoose');

const qrSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    dataUrl: {
        type: String,
        required: true
    },
    qrNumber: {
        type: Number,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Índices para mejorar el rendimiento de las consultas
qrSchema.index({ orderId: 1 });
qrSchema.index({ isActive: 1 });

// Crear un nuevo modelo QR en lugar de modificar uno existente
const QRModel = mongoose.models.QR || mongoose.model('QR', qrSchema);

module.exports = QRModel;  