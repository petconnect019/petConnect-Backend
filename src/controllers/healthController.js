const mongoose = require('mongoose');

class HealthController {
    async checkHealth(req, res, next) {
        try {
            // Verificar conexión a la base de datos
            const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
            
            // Información básica del health check
            const healthInfo = {
                status: 'ok',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                database: dbStatus,
                environment: process.env.NODE_ENV || 'development',
                version: process.env.npm_package_version || '1.0.0'
            };

            // Si la base de datos no está conectada, devolver error
            if (dbStatus === 'disconnected') {
                return res.status(503).json({
                    status: 'error',
                    message: 'Database not connected',
                    ...healthInfo
                });
            }

            // Respuesta exitosa
            res.status(200).json(healthInfo);
        } catch (error) {
            console.error('Error en health check:', error);
            
            // Respuesta de error pero aún devolviendo 200 para Railway
            res.status(200).json({
                status: 'degraded',
                message: 'Health check encountered an error',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
}

module.exports = new HealthController(); 