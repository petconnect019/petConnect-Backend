class HealthController {
    async checkHealth(req, res) {
        try {
            res.status(200).json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                message: 'Servicio funcionando correctamente'
            });
        } catch (error) {
            res.status(500).json({
                status: 'error',
                message: 'Error en el servicio'
            });
        }
    }
}

module.exports = new HealthController(); 