const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    read: {
        type: Boolean,
        default: false
    },
    relatedPet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pet'
    }
}, { timestamps: true });

const MessageModel = mongoose.model('Message', messageSchema);

module.exports = MessageModel; 