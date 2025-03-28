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
        enum: [
            'CREATED',      // Orden creada, pendiente de pago
            'PENDING',      // Pago iniciado pero pendiente
            'ACCEPTED',     // Pago aceptado por ePayco
            'REJECTED',     // Pago rechazado por ePayco
            'FAILED',       // Error en el proceso de pago
            'EXPIRED',      // Tiempo de pago expirado
            'CANCELLED',    // Cancelado por el usuario
            'REFUNDED'      // Reembolso realizado
        ],
        default: 'CREATED'
    },
    paymentStatus: {
        type: String,
        enum: [
            'PENDING',      // Esperando pago
            'PROCESSING',   // Procesando pago
            'COMPLETED',    // Pago completado
            'FAILED',       // Pago fallido
            'REFUNDED'      // Pago reembolsado
        ],
        default: 'PENDING'
    },
    customerId: {
        type: String,
        required: true,
        default: 'PENDING'
    },
    paymentId: {
        type: String // ref_payco de ePayco
    },
    transactionId: {
        type: String // transaction_id o recibo de ePayco
    },
    qrCodes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QR'
    }],
    shippingDetails: {
        address: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        country: {
            type: String,
            required: true,
            default: 'Colombia'
        },
        phone: {
            type: String,
            required: true,
            match: [/^\d{10}$/, 'El número de teléfono debe tener 10 dígitos']
        },
        cellPhone: {
            type: String,
            required: true,
            match: [/^\d{10}$/, 'El número de celular debe tener 10 dígitos']
        }
    },
    customerName: {
        type: String,
        required: true,
        trim: true
    },
    customerLastName: {
        type: String,
        required: true,
        trim: true
    },
    customerEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Por favor ingrese un email válido']
    },
    docNumber: {
        type: String,
        required: true,
        trim: true,
        match: [/^\d{8,12}$/, 'El número de documento debe tener entre 8 y 12 dígitos']
    },
    paymentDetails: {
        cardLast4: String,
        cardBrand: {
            type: String,
            enum: ['visa', 'mastercard', 'american-express', 'diners-club']
        },
        paymentMethod: {
            type: String,
            enum: ['credit_card', 'pse', 'cash', 'pending'],
            required: true,
            default: 'pending'
        }
    },
    paymentResponse: {
        status: String,
        message: String,
        date: Date,
        transactionDate: Date,
        authorizationCode: String,
        errorCode: String,
        responseCode: String,
        responseMessage: String,
        reason: String,
        retryCount: {
            type: Number,
            default: 0
        }
    }
}, { 
    timestamps: true,
    toJSON: { 
        virtuals: true,
        transform: function(doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

// Definir todos los índices en un solo lugar
orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ paymentId: 1 }, { sparse: true });
orderSchema.index({ customerEmail: 1 });
orderSchema.index({ createdAt: -1 });

// Validación pre-save
orderSchema.pre('save', function(next) {
    if (this.isNew) {
        // Validar que el monto total sea correcto
        const unitPrice = 15000; // Precio en COP
        const expectedTotal = this.quantity * unitPrice;
        if (this.totalAmount !== expectedTotal) {
            next(new Error('El monto total no coincide con la cantidad de códigos QR'));
            return;
        }
    }
    next();
});

// Métodos estáticos
orderSchema.statics.updatePaymentStatus = async function(orderId, paymentData) {
    const order = await this.findById(orderId);
    if (!order) throw new Error('Orden no encontrada');

    // Mapear estados de ePayco a estados internos
    const statusMapping = {
        'Aceptada': { status: 'ACCEPTED', paymentStatus: 'COMPLETED' },
        'Pendiente': { status: 'PENDING', paymentStatus: 'PENDING' },
        'Rechazada': { status: 'REJECTED', paymentStatus: 'FAILED' },
        'Fallida': { status: 'FAILED', paymentStatus: 'FAILED' },
        'Reversada': { status: 'REFUNDED', paymentStatus: 'REFUNDED' }
    };

    const newStatus = statusMapping[paymentData.status] || { 
        status: 'FAILED', 
        paymentStatus: 'FAILED' 
    };

    order.status = newStatus.status;
    order.paymentStatus = newStatus.paymentStatus;
    order.paymentResponse = {
        ...order.paymentResponse,
        status: paymentData.status,
        message: paymentData.message,
        date: new Date(),
        transactionDate: paymentData.transactionDate,
        authorizationCode: paymentData.authorizationCode,
        errorCode: paymentData.errorCode,
        responseCode: paymentData.responseCode,
        responseMessage: paymentData.responseMessage,
        reason: paymentData.reason
    };

    await order.save();
    return order;
};

const OrderModel = mongoose.model('Order', orderSchema);
module.exports = OrderModel;
