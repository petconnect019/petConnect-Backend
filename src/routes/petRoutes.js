const express = require('express');
const router = express.Router();
const PetController = require('../controllers/petController');
const { verifyToken } = require('../middlewares/authMiddleware');
const { 
    upload, 
    handleUploadError, 
    checkStorageLimit, 
    cleanupUpload 
} = require('../middlewares/uploadMiddleware');

// Rutas públicas (no requieren autenticación)
router.get('/', PetController.getAllPets); // Ver todas las mascotas
router.get('/:id', PetController.getPetById); // Ver detalles de una mascota específica
router.get('/:id/profile-picture', PetController.getProfilePicture);

// Middleware de autenticación para rutas protegidas
router.use(verifyToken);

// Rutas protegidas (requieren autenticación)
router.post('/', 
    checkStorageLimit,
    upload.single('photo'),
    handleUploadError,
    PetController.createPet,
    cleanupUpload
); // Crear nueva mascota
router.put('/:id', 
    checkStorageLimit,
    upload.array('photos', 5),
    handleUploadError,
    PetController.updatePet,
    cleanupUpload
); // Actualizar mascota existente
router.delete('/:id', PetController.deletePet); // Eliminar mascota

// Rutas específicas del usuario
router.get('/user/pets', PetController.getPetsByOwner); // Obtener mascotas del usuario autenticado

// Rutas para manejo de fotos de perfil
router.put('/:id/profile-picture',
    checkStorageLimit,
    upload.single('photo'),
    handleUploadError,
    PetController.updatePetProfilePicture,
    cleanupUpload
);
router.delete('/:id/profile-picture', PetController.removeProfilePicture);

// Rutas para manejo de fotos adicionales
router.post('/:id/photos',
    checkStorageLimit,
    upload.array('photos', 5),
    handleUploadError,
    PetController.addPetPhotos,
    cleanupUpload
); // Añadir fotos a una mascota
router.delete('/:id/photos/:photoId', PetController.deletePetPhoto); // Eliminar una foto específica
router.get('/download/:photoId', PetController.downloadPetPhoto); // Descargar una foto

// Rutas para estados especiales de mascotas
router.put('/:id/status', PetController.updatePetStatus); // Actualizar estado (perdido, encontrado, etc.)
router.put('/:id/location', PetController.updatePetLocation); // Actualizar ubicación

// Rutas para descargar fotos
router.get('/:id/profile-picture/download', PetController.downloadProfilePicture);
router.get('/:id/photos/download', PetController.downloadAllPhotos);

module.exports = router;
