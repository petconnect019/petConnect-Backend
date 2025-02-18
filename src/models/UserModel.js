const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    google_id: { type: String, unique: true, sparse: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    profile_picture: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    password: { type: String },
    is_profile_public: { type: Boolean, default: false },
    show_contact: { type: Boolean, default: false },
    reset_token: { type: String },
    reset_token_expiration: { type: Date },
    city: { type: String },
    phone: { type: String }
}, { timestamps: true });




const UserModel = mongoose.model('User', userSchema);

module.exports = UserModel;
