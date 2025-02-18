const express = require('express');
const router = express.Router();
const PetController = require('../controllers/petController');
const { verifyToken } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// Rutas públicas
router.get('/', PetController.getAllPets);
router.get('/:id', PetController.getPetById);

// Rutas protegidas
router.use(verifyToken);

// CRUD de mascotas
router.post('/', upload.array('photos', 5), PetController.createPet);
router.put('/:id', PetController.updatePet);
router.delete('/:id', PetController.deletePet);

// Rutas específicas
router.get('/user/pets', PetController.getPetsByOwner);

module.exports = router;
