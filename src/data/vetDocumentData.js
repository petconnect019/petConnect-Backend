const mongoose = require('mongoose');
const VetDocumentModel = require('../models/VetDocumentModel');
const VetReminderModel = require('../models/VetReminderModel');
const PetModel = require('../models/PetModel');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

const VetDocumentData = {
    /**
     * Crear un nuevo documento veterinario
     */
    createDocument: async (documentData, fileBuffer = null, mimeType = null, fileName = null) => {
        try {
            // Validar que la mascota existe y pertenece al usuario
            const pet = await PetModel.findById(documentData.petId);
            if (!pet) {
                throw new Error('Mascota no encontrada');
            }

            if (pet.owner.toString() !== documentData.ownerId) {
                throw new Error('No tienes permiso para agregar documentos a esta mascota');
            }

            // Crear el documento base
            const newDocument = new VetDocumentModel({
                petId: documentData.petId,
                ownerId: documentData.ownerId,
                type: documentData.type,
                title: documentData.title,
                date: new Date(documentData.date),
                nextDue: documentData.nextDue ? new Date(documentData.nextDue) : null,
                veterinary: documentData.veterinary || '',
                notes: documentData.notes || '',
                status: documentData.type === 'vaccine' ? 'active' : 'completed'
            });

            // Subir archivo si existe
            if (fileBuffer && mimeType) {
                const uploadResult = await uploadToCloudinary(fileBuffer, mimeType, 'vet_documents');
                newDocument.fileUrl = uploadResult.secure_url;
                newDocument.fileName = fileName || 'documento.pdf';
                newDocument.fileSize = fileBuffer.length;
                newDocument.mimeType = mimeType;
            }

            await newDocument.save();

            // Si es una vacuna con fecha de próxima dosis, crear recordatorio automático
            if (documentData.type === 'vaccine' && documentData.nextDue) {
                await VetDocumentData.createAutoReminder(documentData.petId, documentData.ownerId, {
                    type: 'vaccine',
                    title: `Refuerzo: ${documentData.title}`,
                    date: documentData.nextDue,
                    priority: 'high'
                });
            }

            return newDocument;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Obtener documentos por mascota
     */
    getDocumentsByPet: async (petId, ownerId) => {
        try {
            // Verificar que la mascota pertenece al usuario
            const pet = await PetModel.findById(petId);
            if (!pet) {
                throw new Error('Mascota no encontrada');
            }

            if (pet.owner.toString() !== ownerId) {
                throw new Error('No tienes permiso para ver estos documentos');
            }

            const documents = await VetDocumentModel.find({
                petId,
                isActive: true
            }).sort({ date: -1 });

            return documents;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Obtener todos los documentos del usuario
     */
    getDocumentsByOwner: async (ownerId) => {
        try {
            const documents = await VetDocumentModel.find({
                ownerId,
                isActive: true
            })
            .populate('petId', 'name species profile_picture')
            .sort({ date: -1 });

            return documents;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Actualizar documento
     */
    updateDocument: async (documentId, updateData, ownerId) => {
        try {
            const document = await VetDocumentModel.findById(documentId);
            if (!document) {
                throw new Error('Documento no encontrado');
            }

            if (document.ownerId.toString() !== ownerId) {
                throw new Error('No tienes permiso para actualizar este documento');
            }

            Object.keys(updateData).forEach(key => {
                if (updateData[key] !== undefined) {
                    if (key === 'date' || key === 'nextDue') {
                        document[key] = updateData[key] ? new Date(updateData[key]) : null;
                    } else {
                        document[key] = updateData[key];
                    }
                }
            });

            await document.save();
            return document;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Eliminar documento
     */
    deleteDocument: async (documentId, ownerId) => {
        try {
            const document = await VetDocumentModel.findById(documentId);
            if (!document) {
                throw new Error('Documento no encontrado');
            }

            if (document.ownerId.toString() !== ownerId) {
                throw new Error('No tienes permiso para eliminar este documento');
            }

            // Eliminar archivo de Cloudinary si existe
            if (document.fileUrl) {
                await deleteFromCloudinary(document.fileUrl);
            }

            document.isActive = false;
            await document.save();

            return true;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Crear recordatorio automático
     */
    createAutoReminder: async (petId, ownerId, reminderData) => {
        try {
            const reminder = new VetReminderModel({
                petId,
                ownerId,
                ...reminderData
            });

            await reminder.save();

            // Obtener información de la mascota
            const pet = await PetModel.findById(petId);

            // Crear notificación para el recordatorio
            const NotificationModel = require('../models/NotificationModel');
            await NotificationModel.create({
                userId: ownerId,
                title: 'Nuevo recordatorio veterinario',
                message: `Se ha creado un recordatorio de ${reminderData.type} para ${pet.name} programado para ${new Date(reminderData.date).toLocaleDateString()}`,
                type: 'reminder',
                actionUrl: '/health-management',
                data: {
                    petId,
                    reminderId: reminder._id,
                    reminderType: reminderData.type,
                    date: reminderData.date
                }
            });

            return reminder;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Obtener recordatorios por mascota
     */
    getRemindersByPet: async (petId, ownerId) => {
        try {
            const pet = await PetModel.findById(petId);
            if (!pet || pet.owner.toString() !== ownerId) {
                throw new Error('No tienes permiso para ver estos recordatorios');
            }

            const reminders = await VetReminderModel.find({
                petId,
                isActive: true
            }).sort({ date: 1 });

            return reminders;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Completar recordatorio
     */
    completeReminder: async (reminderId, ownerId) => {
        try {
            const reminder = await VetReminderModel.findById(reminderId);
            if (!reminder) {
                throw new Error('Recordatorio no encontrado');
            }

            if (reminder.ownerId.toString() !== ownerId) {
                throw new Error('No tienes permiso para modificar este recordatorio');
            }

            reminder.completed = !reminder.completed;
            reminder.completedAt = reminder.completed ? new Date() : null;
            await reminder.save();

            return reminder;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Obtener estadísticas de documentos
     */
    getDocumentStats: async (ownerId) => {
        try {
            const stats = await VetDocumentModel.aggregate([
                { $match: { ownerId: new mongoose.Types.ObjectId(ownerId), isActive: true } },
                {
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 }
                    }
                }
            ]);

            return stats;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Verificar y enviar notificaciones de recordatorios próximos
     */
    checkUpcomingReminders: async () => {
        try {
            const today = new Date();
            const threeDaysFromNow = new Date(today);
            threeDaysFromNow.setDate(today.getDate() + 3);

            // Buscar recordatorios próximos no completados
            const upcomingReminders = await VetReminderModel.find({
                date: { 
                    $gte: today,
                    $lte: threeDaysFromNow
                },
                completed: false,
                reminderSent: false
            }).populate('petId');

            const NotificationModel = require('../models/NotificationModel');

            // Enviar notificación para cada recordatorio
            for (const reminder of upcomingReminders) {
                if (!reminder.petId) continue;

                const daysUntil = Math.ceil((reminder.date - today) / (1000 * 60 * 60 * 24));
                const daysText = daysUntil === 1 ? 'mañana' : `en ${daysUntil} días`;

                await NotificationModel.create({
                    userId: reminder.ownerId,
                    title: '¡Recordatorio próximo!',
                    message: `${reminder.title} para ${reminder.petId.name} está programado para ${daysText}`,
                    type: 'reminder',
                    actionUrl: '/health-management',
                    data: {
                        petId: reminder.petId._id,
                        reminderId: reminder._id,
                        reminderType: reminder.type,
                        date: reminder.date
                    }
                });

                // Marcar recordatorio como notificado
                reminder.reminderSent = true;
                await reminder.save();
            }

            return upcomingReminders.length;
        } catch (error) {
            console.error('Error al verificar recordatorios próximos:', error);
            throw error;
        }
    }
};

module.exports = VetDocumentData; 