const VetDocumentData = require('../../data/vetDocumentData');

const VetDocumentController = {
    /**
     * Crear nuevo documento veterinario
     */
    createDocument: async (req, res, next) => {
        try {
            const ownerId = req.user.id;
            const documentData = {
                ...req.body,
                ownerId
            };

            // Obtener archivo si se envió
            const fileBuffer = req.file?.buffer || null;
            const mimeType = req.file?.mimetype || null;
            const fileName = req.file?.originalname || null;

            const document = await VetDocumentData.createDocument(
                documentData, 
                fileBuffer, 
                mimeType, 
                fileName
            );

            res.status(201).json({
                ok: true,
                message: 'Documento veterinario creado exitosamente',
                document
            });
        } catch (error) {
            console.error('Error al crear documento veterinario:', error);
            next(error);
        }
    },

    /**
     * Obtener documentos por mascota
     */
    getDocumentsByPet: async (req, res, next) => {
        try {
            const { petId } = req.params;
            const ownerId = req.user.id;

            const documents = await VetDocumentData.getDocumentsByPet(petId, ownerId);

            res.status(200).json({
                ok: true,
                documents
            });
        } catch (error) {
            console.error('Error al obtener documentos veterinarios:', error);
            next(error);
        }
    },

    /**
     * Obtener todos los documentos del usuario
     */
    getDocumentsByOwner: async (req, res, next) => {
        try {
            const ownerId = req.user.id;
            const documents = await VetDocumentData.getDocumentsByOwner(ownerId);

            res.status(200).json({
                ok: true,
                documents
            });
        } catch (error) {
            console.error('Error al obtener documentos del usuario:', error);
            next(error);
        }
    },

    /**
     * Actualizar documento
     */
    updateDocument: async (req, res, next) => {
        try {
            const { documentId } = req.params;
            const ownerId = req.user.id;
            const updateData = req.body;

            const document = await VetDocumentData.updateDocument(documentId, updateData, ownerId);

            res.status(200).json({
                ok: true,
                message: 'Documento actualizado exitosamente',
                document
            });
        } catch (error) {
            console.error('Error al actualizar documento:', error);
            next(error);
        }
    },

    /**
     * Eliminar documento
     */
    deleteDocument: async (req, res, next) => {
        try {
            const { documentId } = req.params;
            const ownerId = req.user.id;

            await VetDocumentData.deleteDocument(documentId, ownerId);

            res.status(200).json({
                ok: true,
                message: 'Documento eliminado exitosamente'
            });
        } catch (error) {
            console.error('Error al eliminar documento:', error);
            next(error);
        }
    },

    /**
     * Obtener recordatorios por mascota
     */
    getRemindersByPet: async (req, res, next) => {
        try {
            const { petId } = req.params;
            const ownerId = req.user.id;

            const reminders = await VetDocumentData.getRemindersByPet(petId, ownerId);

            res.status(200).json({
                ok: true,
                reminders
            });
        } catch (error) {
            console.error('Error al obtener recordatorios:', error);
            next(error);
        }
    },

    /**
     * Completar/descompletar recordatorio
     */
    toggleReminder: async (req, res, next) => {
        try {
            const { reminderId } = req.params;
            const ownerId = req.user.id;

            const reminder = await VetDocumentData.completeReminder(reminderId, ownerId);

            res.status(200).json({
                ok: true,
                message: 'Recordatorio actualizado exitosamente',
                reminder
            });
        } catch (error) {
            console.error('Error al actualizar recordatorio:', error);
            next(error);
        }
    },

    /**
     * Obtener estadísticas
     */
    getStats: async (req, res, next) => {
        try {
            const ownerId = req.user.id;
            const stats = await VetDocumentData.getDocumentStats(ownerId);

            res.status(200).json({
                ok: true,
                stats
            });
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            next(error);
        }
    }
};

module.exports = VetDocumentController; 