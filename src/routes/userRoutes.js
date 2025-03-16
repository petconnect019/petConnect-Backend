const express = require('express');
const router = express.Router();
const UserController = require('../controllers/controllerUser/userController');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');
const { 
    upload, 
    handleUploadError, 
    checkStorageLimit
} = require('../middlewares/uploadMiddleware');

// Rutas protegidas (requieren autenticación)
router.use(verifyToken);

// Rutas de administrador
router.get('/admin/users', isAdmin, UserController.getAllUsers);
router.delete('/admin/users/:id', isAdmin, UserController.deleteUser);

// Rutas de perfil de usuario
router.get('/profile', UserController.getProfile);
router.put('/profile', 
    checkStorageLimit,
    upload.single('profile_picture'),
    handleUploadError,
    UserController.updateProfile
);
router.put('/privacy', UserController.updatePrivacy);
router.put('/profile/picture', 
    checkStorageLimit,
    upload.single('profile_picture'),
    handleUploadError,
    UserController.updateProfilePicture
);

// Ruta pública (debe ir al final para evitar conflictos con otras rutas)
router.get('/:id', UserController.getUserById);

module.exports = router;
