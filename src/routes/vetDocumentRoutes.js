const express = require('express');
const router = express.Router();
const VetDocumentController = require('../controllers/controllerVet/vetDocumentController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { upload, handleUploadError } = require('../middlewares/uploadMiddleware');

// Middleware de autenticación para todas las rutas
router.use(requireAuth);

// === RUTAS DE DOCUMENTOS ===

// Crear nuevo documento veterinario
router.post('/documents', 
    upload.single('file'),
    handleUploadError,
    VetDocumentController.createDocument
);

// Obtener documentos por mascota
router.get('/documents/pet/:petId', VetDocumentController.getDocumentsByPet);

// Obtener todos los documentos del usuario
router.get('/documents', VetDocumentController.getDocumentsByOwner);

// Actualizar documento
router.put('/documents/:documentId', VetDocumentController.updateDocument);

// Eliminar documento
router.delete('/documents/:documentId', VetDocumentController.deleteDocument);

// === RUTAS DE RECORDATORIOS ===

// Obtener recordatorios por mascota
router.get('/reminders/pet/:petId', VetDocumentController.getRemindersByPet);

// Completar/descompletar recordatorio
router.patch('/reminders/:reminderId/toggle', VetDocumentController.toggleReminder);

// === RUTAS DE ESTADÍSTICAS ===

// Obtener estadísticas del usuario
router.get('/stats', VetDocumentController.getStats);

module.exports = router; 