const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    google_id: {
         type: String, 
         unique: true, 
         sparse: true 
        },
    name: {
         type: String,
         required: true
        },
    email: {
        type: String,
        unique: true,
        trim: true,
        lowercase: true,
    },
    profile_picture: {
         type: String 
        },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    password: {
        type: String,
        select: false
    },
    is_profile_public: {
         type: Boolean, 
         default: false 
        },
    show_contact: { 
        type: Boolean, 
        default: false
     },
     gender : {
        type: String,
        enum: ['Masculino', 'Femenino', 'Otro'],
        default: 'Otro'
     },
    reset_token:
     {
        type: String
      },
    reset_token_expiration: {
         type: Date 
        },
    city: { 
        type: String 
    },
    state: {
        type: String
    },
    country: {
        type: String,
        default: 'Colombia'
    },
    address: {
        type: String
    },
    phone: { 
        type: String 
    },
    is_active: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const UserModel = mongoose.model('User', userSchema);

module.exports = UserModel;
