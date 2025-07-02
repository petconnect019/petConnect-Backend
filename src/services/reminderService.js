const VetDocumentData = require('../data/vetDocumentData');

class ReminderService {
    constructor() {
        this.checkInterval = 1000 * 60 * 60; // 1 hora
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.checkReminders();
        
        // Programar verificaciones periódicas
        this.intervalId = setInterval(() => {
            this.checkReminders();
        }, this.checkInterval);

        console.log('Servicio de recordatorios iniciado');
    }

    stop() {
        if (!this.isRunning) return;
        
        clearInterval(this.intervalId);
        this.isRunning = false;
        
        console.log('Servicio de recordatorios detenido');
    }

    async checkReminders() {
        try {
            const notificationsCount = await VetDocumentData.checkUpcomingReminders();
            console.log(`Verificación de recordatorios completada. ${notificationsCount} notificaciones enviadas.`);
        } catch (error) {
            console.error('Error al verificar recordatorios:', error);
        }
    }
}

// Exportar una única instancia del servicio
const reminderService = new ReminderService();
module.exports = reminderService; 