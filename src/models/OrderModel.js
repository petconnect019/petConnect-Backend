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
    invoiceUrl: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const OrderModel = mongoose.model('Order', orderSchema);

module.exports = OrderModel; 