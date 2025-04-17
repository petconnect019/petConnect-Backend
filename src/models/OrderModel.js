const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    qrCount: {
        type: Number,
        required: true,
        min: 1
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    paymentId: {
        type: String,
        required: false
    },
    qrCodes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QR'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Índices para mejorar el rendimiento de las consultas
orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

// Middleware para validaciones
orderSchema.pre('save', function(next) {
    // Validar que el monto sea correcto según la cantidad de QRs
    const unitPrice = 10000; // Precio unitario en COP
    const expectedAmount = this.qrCount * unitPrice;
    
    if (this.amount !== expectedAmount) {
        next(new Error('El monto no coincide con la cantidad de códigos QR'));
        return;
    }
    
    this.updatedAt = new Date();
    next();
});

const OrderModel = mongoose.model('Order', orderSchema);

module.exports = OrderModel;
