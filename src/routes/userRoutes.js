const express = require('express');
const router = express.Router();
const UserController = require('../controllers/controllerUser/userController');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');
const { 
    upload, 
    handleUploadError, 
    checkStorageLimit
} = require('../middlewares/uploadMiddleware');

// Rutas públicas (no requieren autenticación)
router.get('/:id/pets', UserController.getUserPets); 
router.get('/:id', UserController.getPublicUserProfile);

// Rutas protegidas (requieren autenticación)
router.use(verifyToken);

// Rutas de administrador
router.get('/admin/users', isAdmin, UserController.getAllUsers);
router.get('/admin/users/:id', isAdmin, UserController.getUserById);
router.put('/admin/users/:id/status', isAdmin, UserController.toggleUserStatus);

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

router.delete('/profile/picture', UserController.removeProfilePicture);

// Ruta para desactivar la cuenta del propio usuario
router.delete('/profile', UserController.deactivateAccount);

module.exports = router;