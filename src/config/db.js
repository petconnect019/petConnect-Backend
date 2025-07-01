const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI no está configurada en las variables de entorno');
        }

        console.log('🔗 Intentando conectar a MongoDB...');
        console.log(`📍 Base de datos: ${process.env.MONGODB_URI.includes('mongodb.net') ? 'MongoDB Atlas' : 'MongoDB Local'}`);

        const options = {
            // Timeouts optimizados para Railway/producción
            serverSelectionTimeoutMS: 10000, // 10 segundos
            socketTimeoutMS: 20000,           // 20 segundos
            connectTimeoutMS: 10000,          // 10 segundos
            heartbeatFrequencyMS: 10000,      // 10 segundos
            
            // Pool de conexiones optimizado
            maxPoolSize: 10,                  // Reducido para Railway
            minPoolSize: 2,
            maxIdleTimeMS: 30000,             // 30 segundos
            
            // Configuraciones de escritura
            retryReads: true,
            retryWrites: true,
            w: 'majority',
            wtimeoutMS: 5000                  // 5 segundos
            
            // Nota: bufferMaxEntries, useNewUrlParser, useUnifiedTopology 
            // son deprecated en Mongoose 8+ y se removieron
        };

        await mongoose.connect(process.env.MONGODB_URI, options);
        
        console.log('✅ Conexión a MongoDB establecida exitosamente');
        console.log(`📊 Estado de conexión: ${mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado'}`);
        
        return true;
    } catch (error) {
        console.error('❌ Error al conectar a MongoDB:', error.message);
        console.error('📋 Detalles del error:', error);
        
        // Proporcionar diagnóstico específico
        if (error.message.includes('ENOTFOUND')) {
            console.error('💡 Diagnóstico: Problema de DNS/conectividad de red');
        } else if (error.message.includes('authentication failed')) {
            console.error('💡 Diagnóstico: Credenciales incorrectas en MONGODB_URI');
        } else if (error.message.includes('MONGODB_URI')) {
            console.error('💡 Diagnóstico: Variable MONGODB_URI no configurada');
        }
        
        // En lugar de salir inmediatamente, dar tiempo para diagnóstico
        console.error('💀 La aplicación se cerrará en 5 segundos...');
        setTimeout(() => {
        process.exit(1); 
        }, 5000);
        
        throw error; // Re-lanzar el error para que el caller lo maneje
    }
};

module.exports = { connectDB };
