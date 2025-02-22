const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// Rutas protegidas (requieren autenticación)
router.use(verifyToken);

// Rutas de administrador
router.get('/admin/users', isAdmin, UserController.getAllUsers);
router.delete('/admin/users/:id', isAdmin, UserController.deleteUser);

// Rutas de perfil de usuario
router.get('/profile', UserController.getProfile);
router.put('/profile', upload.single('profile_picture'), UserController.updateProfile);
router.put('/privacy', UserController.updatePrivacy);
router.put('/profile/picture', verifyToken, upload.single('profile_picture'), UserController.updateProfilePicture);

// Ruta pública (debe ir al final para evitar conflictos con otras rutas)
router.get('/:id', UserController.getUserById);

module.exports = router;
