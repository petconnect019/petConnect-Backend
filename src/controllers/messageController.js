const messageData = require('../data/messageData');

const messageController = {
    // Enviar mensaje al dueño de una mascota
    sendMessageToOwner: async (req, res) => {
        try {
            const { petId, subject, content, contactInfo, location } = req.body;
            
            await messageData.sendMessageToOwner({
                sender: req.user ? req.user.id : null,
                petId,
                subject,
                content,
                contactInfo,
                location
            });
            
            res.status(201).json({
                success: true,
                message: 'Mensaje enviado correctamente al dueño de la mascota'
            });
        } catch (error) {
            console.error('Error al enviar mensaje:', error);
            
            if (error.message === 'Mascota no encontrada') {
                return res.status(404).json({
                    success: false,
                    message: 'Mascota no encontrada'
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Error al enviar el mensaje',
                error: error.message
            });
        }
    },

    // Obtener mensajes del usuario
    getUserMessages: async (req, res) => {
        try {
            const userId = req.user.id;
            const messages = await messageData.getUserMessages(userId);
            
            res.json({
                success: true,
                messages
            });
        } catch (error) {
            console.error('Error al obtener mensajes:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener los mensajes',
                error: error.message
            });
        }
    },

    // Marcar mensaje como leído
    markMessageAsRead: async (req, res) => {
        try {
            const { messageId } = req.params;
            const userId = req.user.id;
            
            await messageData.markMessageAsRead(messageId, userId);
            
            res.json({
                success: true,
                message: 'Mensaje marcado como leído'
            });
        } catch (error) {
            console.error('Error al marcar mensaje como leído:', error);
            
            if (error.message === 'Mensaje no encontrado') {
                return res.status(404).json({
                    success: false,
                    message: 'Mensaje no encontrado'
                });
            }
            
            if (error.message === 'No tienes permiso para marcar este mensaje') {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para marcar este mensaje'
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Error al marcar el mensaje como leído',
                error: error.message
            });
        }
    }
};

module.exports = messageController; 