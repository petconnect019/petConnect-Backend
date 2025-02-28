const express = require('express');
const router = express.Router();
const PetController = require('../controllers/petController');
const { verifyToken } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// Rutas públicas (no requieren autenticación)
router.get('/', PetController.getAllPets); // Ver todas las mascotas
router.get('/:id', PetController.getPetById); // Ver detalles de una mascota específica

// Middleware de autenticación para rutas protegidas
router.use(verifyToken);

// Rutas protegidas (requieren autenticación)
router.post('/', upload.array('photos', 5), PetController.createPet); // Crear nueva mascota
router.put('/:id', upload.array('photos', 5), PetController.updatePet); // Actualizar mascota existente
router.delete('/:id', PetController.deletePet); // Eliminar mascota

// Rutas específicas del usuario
router.get('/user/pets', PetController.getPetsByOwner); // Obtener mascotas del usuario autenticado

// Rutas para manejo de fotos
router.post('/:id/photos', upload.array('photos', 5), PetController.addPetPhotos); // Añadir fotos a una mascota
router.delete('/:id/photos/:photoId', PetController.deletePetPhoto); // Eliminar una foto específica
router.get('/download/:photoId', PetController.downloadPetPhoto); // Descargar una foto

// Rutas para estados especiales de mascotas
router.put('/:id/status', PetController.updatePetStatus); // Actualizar estado (perdido, encontrado, etc.)
router.put('/:id/location', PetController.updatePetLocation); // Actualizar ubicación

module.exports = router;
