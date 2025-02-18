const mongoose = require('mongoose');


const petSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50 
    },
    species: { 
        type: String, 
        required: true,
        enum: ['dog', 'cat', 'bird', 'other']
    },
    breed: { 
        type: String,
        trim: true,
        maxlength: 50 
    },
    age: { 
        type: Number, 
        min: 0,
        max: 50 
    },
    description: { 
        type: String,
        trim: true,
        maxlength: 500 
    },
    photos: [{ 
        type: String, 
        match: [/^https?:\/\/.+\.(jpg|jpeg|png|gif)$/i, 'Formato de imagen inválido']
    }],
    owner: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['available', 'adopted', 'lost', 'found'],
        default: 'available'
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