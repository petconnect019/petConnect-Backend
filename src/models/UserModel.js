const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    google_id: { type: String, unique: true, sparse: true },
    name: { type: String },
    email: {
        type: String,
        required: [true, 'El email es requerido'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'Por favor ingresa un email válido']
    },
    profile_picture: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    password: {
        type: String,
        required: function() { return !this.google_id; },
        minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
        validate: {
            validator: function(password) {
                // Al menos una letra mayúscula, una minúscula y un número
                return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/.test(password);
            },
            message: 'La contraseña debe contener al menos una letra mayúscula, una minúscula y un número'
        }
    },
    is_profile_public: { type: Boolean, default: false },
    show_contact: { type: Boolean, default: false },
    reset_token: { type: String },
    reset_token_expiration: { type: Date },
    city: { type: String },
    phone: { type: String }
}, { timestamps: true });

// Middleware pre-save para hashear la contraseña
userSchema.pre('save', async function(next) {
    if (this.isModified('password') && this.password) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});

const UserModel = mongoose.model('User', userSchema);

module.exports = UserModel;
