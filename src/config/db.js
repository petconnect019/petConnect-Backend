const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI,{});
        console.log('✅ Conectado a MongoDB 🚀....');
    } catch (error) {
        console.error('❌ Error al conectar a MongoDB:', error.message);
        process.exit(1); // Salir de la app si hay un error
    }
};

module.exports = { connectDB };
