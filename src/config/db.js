const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI,{
            serverSelectionTimeoutMS: 60000,
            socketTimeoutMS: 60000,
            maxPoolSize: 50,
            maxIdleTimeMS: 60000,
            connectTimeoutMS: 60000,
            heartbeatFrequencyMS: 60000,
            retryReads: true,
            w: 'majority',
            wtimeoutMS : 10000,
        });
        console.log('✅ Conectado a MongoDB 🚀....');
    } catch (error) {
        console.error('❌ Error al conectar a MongoDB:', error.message);
        process.exit(1); 
    }
};

module.exports = { connectDB };
