const mongoose = require('mongoose');

const petSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    gender: {
        type: String,
        default: 'No especificado',
        enum: ['Macho', 'Hembra']
    },
    species: {
        type: String,
        default: 'No especificado'
    },
    breed: {
        type: String,
        default: 'No especificado'
    },
    age: {
        type: String,
        default: 'No especificado'
    },
    description: {
        type: String,
        default: ''
    },
    photos: [{
        type: String
    }],
    is_lost: {
        type: Boolean,
        default: false
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    estatus: {
        type: String,
        enum: ['disponible', 'adoptado', 'perdido', 'encontrado'],
        default: 'disponible'
    },
    location: {
        city: { type: String, trim: true, maxlength: 100 },
        address: { type: String, trim: true, maxlength: 200 },
        coordinates: {
            latitude: { 
                type: Number, 
                min: -90, 
                max: 90 
            },
            longitude: { 
                type: Number, 
                min: -180, 
                max: 180 
            }
        }
    }
}, { timestamps: true });

const PetModel = mongoose.model('Pet', petSchema);

module.exports = PetModel;