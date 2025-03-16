const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/controllerrAdmin/adminController');
const PetController = require('../controllers/ControllerPet/petController');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');

// Todas las rutas de admin requieren autenticación y rol de admin
router.use(verifyToken, isAdmin);

// Gestión de usuarios
router.get('/users', AdminController.getAllUsers);
router.delete('/users/:id', AdminController.deleteUser);
router.post('/register', AdminController.registerUser);

// Gestión de mascotas
router.get('/pets', PetController.getAllPets);
router.delete('/pets/:id', PetController.deletePet);
router.put('/pets/:id', PetController.updatePet);

module.exports = router; 