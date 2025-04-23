const mongoose = require('mongoose');

const qrCodeSchema = new mongoose.Schema({
    qrId: {
        type: String,
        required: true,
        unique: true
    },
    qrImage: {
        type: String,
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
    petId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pet',
        default: null
    }
}, {
    timestamps: true
});

// Crear el modelo
const QRCode = mongoose.model('QRCode', qrCodeSchema);

module.exports = QRCode; 