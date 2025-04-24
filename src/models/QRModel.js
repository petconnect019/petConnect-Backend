const mongoose = require('mongoose');

const qrSchema = new mongoose.Schema({
    qrId: {
        type: String,
        unique: true
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isLinked: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    petId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pet',
        default: null
    },
    qrImage: {
        type: String,
        default: null
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