const mongoose = require('mongoose');

const petSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    gender: {
        type: String,
        enum: ['Macho', 'Hembra', 'No especificado'],
        default: 'No especificado'
    },
    species: {
        type: String,
        enum: ['cat', 'dog','No especificado'],
        default: 'No especificado'
    },
    color:{
        type: String ,
        default: 'No especificado',
      
    },
    status:{
        type: String,
        enum:['Disponible','Perdido', 'Encontrado'],
        default: 'Disponible'
    },
    breed: {
        type: String,
        default: 'No especificado'
    },
    birthDate: {
        type: Date,
      
    },
    description: {
        type: String,
        default: ''
    },
    profile_picture: {
        type: String,
        default: null
    },
    medicalInfo: String,
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    photos:{
        type: Array,
        default: []
    },

    lastSeenLocation: {
        latitude: Number,
        longitude: Number,
        address: String
    },
    lostDate: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual para calcular la edad
petSchema.virtual('calculatedAge').get(function() {
    if (!this.birthDate) return null;

    const today = new Date();
    const birthDate = new Date(this.birthDate);
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    
    // Ajustar los años si aún no ha llegado el mes de cumpleaños
    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
        years--;
        months = 12 + months;
    }

    // Si es menor de un año, mostrar meses
    if (years === 0) {
        // Si es menor de un mes, mostrar días
        if (months === 0) {
            const days = Math.floor((today - birthDate) / (1000 * 60 * 60 * 24));
            return `${days} día${days !== 1 ? 's' : ''}`;
        }
        return `${months} mes${months !== 1 ? 'es' : ''}`;
    }

    // Para mascotas de un año o más
    return `${years} año${years !== 1 ? 's' : ''}`;
});

const PetModel = mongoose.model('Pet', petSchema);

module.exports = PetModel;