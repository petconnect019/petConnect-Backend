const express = require('express');
const router = express.Router();
const PetController = require('../controllers/ControllerPet/petController');
const PhotoController = require('../controllers/ControllerPet/photoPetController');
const ProfilePictureController = require('../controllers/ControllerPet/profilePictureController');
const { verifyToken, optionalAuth, isPetOwnerOrAdmin } = require('../middlewares/authMiddleware');
const { 
    upload, 
    handleUploadError, 
    checkStorageLimit
} = require('../middlewares/uploadMiddleware');

// Rutas públicas (no requieren autenticación)
router.get('/download/:photoId', PhotoController.downloadPetPhoto); // Descargar una foto
router.get('/user/pets', verifyToken, PetController.getPetsByOwner); // Obtener mascotas del usuario autenticado
router.get('/', PetController.getAllPets); // Ver todas las mascotas
router.get('/:id/profile-picture', ProfilePictureController.getProfilePicture);
router.get('/:id/profile-picture/download', ProfilePictureController.downloadProfilePicture);
router.get('/:id/photos/download', PhotoController.downloadAllPhotos);
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
    verifyToken,
    isPetOwnerOrAdmin,
    checkStorageLimit,
    upload.single('photo'),
    handleUploadError,
    ProfilePictureController.updatePetProfilePicture
);

// Eliminar foto de perfil
router.delete('/:id/profile-picture', ProfilePictureController.removeProfilePicture);

// Rutas para manejo de fotos adicionales
// Añadir fotos a una mascota
router.post('/:id/photos',
    verifyToken,
    isPetOwnerOrAdmin,
    checkStorageLimit,
    upload.array('photos', 5),
    handleUploadError,
    PhotoController.addPetPhotos
); 
router.delete('/:id/photos/:photoId', PhotoController.deletePetPhoto); // Eliminar una foto específica

// Rutas para estados especiales de mascotas
router.put('/:id/location', PetController.updatePetLocation); // Actualizar ubicación

module.exports = router;
