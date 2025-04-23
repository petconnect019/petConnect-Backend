class HealthController {
    async checkHealth(req, res) {
        try {
            // Respuesta mínima y eficiente
            res.status(200).json({ status: 'ok' });
        } catch (error) {
            res.status(500).json({ status: 'error' });
        }
    }
}

module.exports = new HealthController(); 