const multer = require('multer');
const UserModel = require('../models/UserModel');
const PetModel = require('../models/PetModel');

// Constantes para límites
const LIMITS = {
    FILE_SIZE: 5 * 1024 * 1024,        // 5MB por archivo
    TOTAL_USER_SIZE: 50 * 1024 * 1024, // 50MB por usuario
    MAX_FILES: 5                        // Máximo 5 archivos por solicitud
};

// Configurar almacenamiento en memoria
const storage = multer.memoryStorage();

// Validar tipo de archivo
const validateFileType = (file) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    return allowedTypes.includes(file.mimetype);
};

// Filtrar archivos
const fileFilter = (req, file, cb) => {
    if (!validateFileType(file)) {
        return cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, GIF, WEBP)'), false);
    }
    cb(null, true);
};

// Calcular tamaño total de archivos del usuario
const calculateUserStorageSize = async (userId) => {
    try {
        const [user, pets] = await Promise.all([
            UserModel.findById(userId).select('profile_picture'),
            PetModel.find({ owner: userId }).select('profile_picture photos')
        ]);

        let totalSize = 0;

        // Sumar tamaño de foto de perfil del usuario
        if (user?.profile_picture) {
            totalSize += LIMITS.FILE_SIZE; // Estimación conservadora
        }

        // Sumar tamaño de fotos de mascotas
        pets.forEach(pet => {
            if (pet.profile_picture) {
                totalSize += LIMITS.FILE_SIZE;
            }
            totalSize += (pet.photos?.length || 0) * LIMITS.FILE_SIZE;
        });

        return totalSize;
    } catch (error) {
        throw new Error('Error al calcular el almacenamiento del usuario');
    }
};

// Middleware para verificar límites de almacenamiento
const checkStorageLimit = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const currentSize = await calculateUserStorageSize(userId);
        const newFileSize = req.files ? 
            req.files.length * LIMITS.FILE_SIZE : 
            LIMITS.FILE_SIZE;

        if (currentSize + newFileSize > LIMITS.TOTAL_USER_SIZE) {
            return res.status(400).json({
                ok: false,
                message: `Has excedido el límite de almacenamiento (${LIMITS.TOTAL_USER_SIZE / (1024 * 1024)}MB)`
            });
        }
        next();
    } catch (error) {
        return res.status(500).json({
            ok: false,
            message: 'Error al verificar el almacenamiento'
        });
    }
};

// Configurar multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: LIMITS.FILE_SIZE,
        files: LIMITS.MAX_FILES
    }
});

// Manejar errores de multer
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                ok: false,
                message: `El archivo excede el tamaño máximo de ${LIMITS.FILE_SIZE / (1024 * 1024)}MB`
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                ok: false,
                message: `Máximo ${LIMITS.MAX_FILES} archivos permitidos`
            });
        }
        return res.status(400).json({
            ok: false,
            message: `Error en la subida: ${err.message}`
        });
    }
    if (err) {
        return res.status(400).json({
            ok: false,
            message: err.message
        });
    }
    next();
};

module.exports = {
    upload,
    handleUploadError,
    checkStorageLimit,
    LIMITS
}; 