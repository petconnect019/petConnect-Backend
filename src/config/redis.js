const { createClient } = require('redis');

const redisClient = createClient({
    username: 'default',
    password: 'BdUamAusGZbGi7vX61P8tVZ15xr82dtx',
    socket: {
        host: 'redis-12221.c251.east-us-mz.azure.redns.redis-cloud.com',
        port: 12221,
        reconnectStrategy: (retries) => {
            if (retries > 10) {
                return new Error('Número máximo de reconexiones alcanzado');
            }
            return Math.min(retries * 100, 3000);
        }
    }
});

// Mejorar el manejo de eventos de Redis
redisClient.on('error', err => {
    console.error('Error de conexión Redis:', err);
});

redisClient.on('connect', () => {
    console.log('Intentando conectar a Redis...');
});

redisClient.on('ready', () => {
    console.log('Redis está listo para recibir comandos');
});

redisClient.on('reconnecting', () => {
    console.log('Intentando reconectar a Redis...');
});

// Función para inicializar la conexión
const initRedis = async () => {
    try {
        await redisClient.connect();
        console.log('Conexión exitosa a Redis');
    } catch (error) {
        console.error('Error al conectar con Redis:', error);
        throw error; // Propagar el error para que el servidor no inicie si Redis falla
    }
};

module.exports = {
    redisClient,
    initRedis
}; 