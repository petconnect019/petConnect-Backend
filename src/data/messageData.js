const MessageModel = require('../models/MessageModel');
const PetModel = require('../models/PetModel');

const messageData = {
    /**
     * Enviar mensaje al dueño de una mascota
     * @param {Object} messageData - Datos del mensaje
     * @param {string} messageData.sender - ID del remitente (opcional)
     * @param {string} messageData.petId - ID de la mascota
     * @param {string} messageData.subject - Asunto del mensaje
     * @param {string} messageData.content - Contenido del mensaje
     * @param {string} messageData.contactInfo - Información de contacto (opcional)
     * @param {Object} messageData.location - Ubicación (opcional)
     * @returns {Promise<Object>} - El mensaje creado
     */
    sendMessageToOwner: async (messageData) => {
        const { sender, petId, subject, content, contactInfo, location } = messageData;
        
        // Verificar si la mascota existe
        const pet = await PetModel.findById(petId);
        
        if (!pet) {
            throw new Error('Mascota no encontrada');
        }
        
        // Crear el mensaje
        const message = await MessageModel.create({
            sender,
            receiver: pet.owner,
            petId,
            subject,
            content,
            contactInfo,
            location
        });
        
        return message;
    },
    
    /**
     * Obtener mensajes de un usuario
     * @param {string} userId - ID del usuario
     * @returns {Promise<Array>} - Lista de mensajes
     */
    getUserMessages: async (userId) => {
        const messages = await MessageModel.find({ receiver: userId })
            .populate('petId', 'name species breed')
            .sort({ createdAt: -1 });
        
        return messages;
    },
    
    /**
     * Marcar un mensaje como leído
     * @param {string} messageId - ID del mensaje
     * @param {string} userId - ID del usuario
     * @returns {Promise<Object>} - El mensaje actualizado
     */
    markMessageAsRead: async (messageId, userId) => {
        // Verificar si el mensaje existe
        const message = await MessageModel.findById(messageId);
        
        if (!message) {
            throw new Error('Mensaje no encontrado');
        }
        
        // Verificar si el usuario tiene permiso para marcar este mensaje
        if (message.receiver.toString() !== userId) {
            throw new Error('No tienes permiso para marcar este mensaje');
        }
        
        // Actualizar el mensaje
        const updatedMessage = await MessageModel.findByIdAndUpdate(
            messageId,
            { isRead: true },
            { new: true }
        );
        
        return updatedMessage;
    }
};

module.exports = messageData; 