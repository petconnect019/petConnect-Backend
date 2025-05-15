const Queue = require('bull');
const AuthData = require('../data/authData');

// Crear una nueva cola para el registro de usuarios
const registrationQueue = new Queue('user-registration', {
    redis: {
        host: process.env.REDIS_HOST || 'redis-12221.c251.east-us-mz.azure.redns.redis-cloud.com',
        port: process.env.REDIS_PORT || 12221,
        username: process.env.REDIS_USERNAME || 'default',
        password: process.env.REDIS_PASSWORD || 'BdUamAusGZbGi7vX61P8tVZ15xr82dtx',
    },
    limiter: {
        max: 10, // Procesar máximo 10 trabajos
        duration: 1000 // en un período de 1 segundo
    }
});

// Procesar trabajos de la cola
registrationQueue.process(async (job) => {
    try {
        const userData = job.data;
        
        // Usar el servicio existente para el registro
        const { user, isNewUser } = await AuthData.registerUser(userData);

        return { 
            success: true, 
            userId: user._id,
            isNewUser 
        };
    } catch (error) {
        console.error('Error en el procesamiento de registro:', error);
        throw error;
    }
});

// Manejar eventos de la cola
registrationQueue.on('completed', (job, result) => {
    console.log(`Registro completado para el trabajo ${job.id}:`, result);
});

registrationQueue.on('failed', (job, error) => {
    console.error(`Error en el trabajo ${job.id}:`, error);
});

registrationQueue.on('error', (error) => {
    console.error('Error en la cola de registro:', error);
});

module.exports = registrationQueue; 