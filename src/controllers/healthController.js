class HealthController {
    async checkHealth(req, res, next) {
        try {
            // Respuesta mínima y eficiente
            res.status(200).json({ status: 'ok' });
        } catch (error) {
            console.error('Error en health check:', error);
            next(error);
        }
    }
}

module.exports = new HealthController(); 