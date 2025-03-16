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
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled'],
        default: 'pending'
    },
    paymentId: {
        type: String,
        required: true
    },
    shippingDetails: {
        address: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    customerName: {
        type: String,
        required: true
    },
    customerEmail: {
        type: String,
        required: true
    },
    invoiceUrl: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentId: 1 });
orderSchema.index({ customerEmail: 1 });

const OrderModel = mongoose.model('Order', orderSchema);

module.exports = OrderModel; 