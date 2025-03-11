const MessageModel = require('../models/MessageModel');
const PetModel = require('../models/PetModel');

const messageController = {
    // Enviar mensaje al dueño de una mascota
    sendMessageToOwner: async (req, res) => {
        try {
            const { petId, subject, content, contactInfo, location } = req.body;
            
            // Verificar si la mascota existe
            const pet = await PetModel.findById(petId);
            
            if (!pet) {
                return res.status(404).json({
                    success: false,
                    message: 'Mascota no encontrada'
                });
            }
            
            // Crear el mensaje
            const message = await MessageModel.create({
                sender: req.user ? req.user.id : null,
                receiver: pet.owner,
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
            const messages = await MessageModel.find({ receiver: userId })
                .populate('petId', 'name species breed')
                .sort({ createdAt: -1 });
            
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
            
            // Verificar si el mensaje existe
            const message = await MessageModel.findById(messageId);
            
            if (!message) {
                return res.status(404).json({
                    success: false,
                    message: 'Mensaje no encontrado'
                });
            }
            
            // Verificar si el usuario tiene permiso para marcar este mensaje
            if (message.receiver.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para marcar este mensaje'
                });
            }
            
            // Actualizar el mensaje
            const updatedMessage = await MessageModel.findByIdAndUpdate(
                messageId,
                { isRead: true },
                { new: true }
            );
            
            res.json({
                success: true,
                message: 'Mensaje marcado como leído'
            });
        } catch (error) {
            console.error('Error al marcar mensaje como leído:', error);
            res.status(500).json({
                success: false,
                message: 'Error al marcar el mensaje como leído',
                error: error.message
            });
        }
    }
};

module.exports = messageController; 