const mongoose = require('mongoose');

const qrSchema = new mongoose.Schema({
    qrId: {
        type: String,
        required: true,
        unique: true
    },
    petId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pet',
        required: false
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: false
    },
    isLinked: {
        type: Boolean,
        default: false
    },
    qrImage: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const QRModel = mongoose.model('QR', qrSchema);

module.exports = QRModel;  