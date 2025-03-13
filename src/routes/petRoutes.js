const express = require('express');
const router = express.Router();
const PetController = require('../controllers/petController');
const { verifyToken, optionalAuth } = require('../middlewares/authMiddleware');
const { 
    upload, 
    handleUploadError, 
    checkStorageLimit
} = require('../middlewares/uploadMiddleware');

// Rutas públicas (no requieren autenticación)
router.get('/download/:photoId', PetController.downloadPetPhoto); // Descargar una foto
router.get('/user/pets', verifyToken, PetController.getPetsByOwner); // Obtener mascotas del usuario autenticado
router.get('/', PetController.getAllPets); // Ver todas las mascotas
router.get('/:id/profile-picture', PetController.getProfilePicture);
router.get('/:id/profile-picture/download', PetController.downloadProfilePicture);
router.get('/:id/photos/download', PetController.downloadAllPhotos);
router.get('/:id', PetController.getPetById); // Ver detalles de una mascota específica
router.get('/public/:petId', optionalAuth, PetController.getPublicProfile);

// Middleware de autenticación para rutas protegidas
router.use(verifyToken);

// Rutas protegidas (requieren autenticación)
// Crear nueva mascota
router.post('/', 
    checkStorageLimit,
    upload.single('photo'),
    handleUploadError,
    PetController.createPet
); 

// Actualizar mascota existente
router.put('/:id', 
    checkStorageLimit,
    upload.array('photos', 5),
    handleUploadError,
    PetController.updatePet
); 
router.delete('/:id', PetController.deletePet); // Eliminar mascota

// Rutas para manejo de fotos de perfil
router.put('/:id/profile-picture',
    checkStorageLimit,
    upload.single('photo'),
    handleUploadError,
    PetController.updatePetProfilePicture
);

// Eliminar foto de perfil
router.delete('/:id/profile-picture', PetController.removeProfilePicture);

// Rutas para manejo de fotos adicionales
// Añadir fotos a una mascota
router.post('/:id/photos',
    checkStorageLimit,
    upload.array('photos', 5),
    handleUploadError,
    PetController.addPetPhotos
); 
router.delete('/:id/photos/:photoId', PetController.deletePetPhoto); // Eliminar una foto específica

// Rutas para estados especiales de mascotas
router.put('/:id/status', PetController.updatePetStatus); // Actualizar estado (perdido, encontrado, etc.)
router.put('/:id/location', PetController.updatePetLocation); // Actualizar ubicación

// Crear mascota con QR
router.post('/with-qr', 
    checkStorageLimit,
    upload.single('photo'),
    handleUploadError,
    PetController.createPetWithQR
);

// Rutas para reportar mascota perdida/encontrada
router.post('/:petId/lost', PetController.reportLost);
router.post('/:petId/found', PetController.reportFound);

module.exports = router;
