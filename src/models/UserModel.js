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
        },
    email: {
        type: String,
        unique: true,
        trim: true,
        lowercase: true,
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    profile_picture: {
         type: String 
        },
    bio: {
        type: String,
        default: ''
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
         default: true 
        },
    show_contact: { 
        type: Boolean, 
        default: true
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
        type: String
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
