const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'CREATED', 'ACCEPTED', 'REJECTED'],
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'FAILED', 'PROCESSING'],
        default: 'PENDING'
    },
    customerName: {
        type: String,
        required: false
    },
    customerEmail: {
        type: String,
        required: false
    },
    customerLastName: {
        type: String,
        required: false
    },
    docNumber: {
        type: String,
        required: false
    },
    transactionId: {
        type: String,
        default: null
    },
    shippingDetails: {
        address: String,
        city: String,
        state: String,
        postalCode: String,
        country: String
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
    },
    epaycoRef: {
        type: String,
        default: null
    },
    paymentData: {
        transactionId: String,
        approvalCode: String,
        amount: Number,
        transactionDate: Date,
        responseCode: String,
        paymentMethod: String,
        last4: String
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
    const unitPrice = 15000; // Precio unitario en COP
    const expectedAmount = this.quantity * unitPrice;
    
    if (this.totalAmount !== expectedAmount) {
        next(new Error('El monto no coincide con la cantidad de códigos QR'));
        return;
    }
    
    this.updatedAt = new Date();
    next();
});

const OrderModel = mongoose.model('Order', orderSchema);

module.exports = OrderModel;
