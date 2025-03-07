const multer = require('multer');
const path = require('path');
const fs = require('fs');
const UserModel = require('../models/UserModel');
const PetModel = require('../models/PetModel');

// Constantes para límites
const LIMITS = {
    FILE_SIZE: 5 * 1024 * 1024,        // 5MB por archivo
    TOTAL_USER_SIZE: 50 * 1024 * 1024, // 50MB por usuario
    MAX_FILES: 5                        // Máximo 5 archivos por solicitud
};

// Crear el directorio si no existe
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configurar almacenamiento
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueFilename);
    }
});

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
            totalSize += LIMITS.FILE_SIZE;
        }

        // Sumar tamaño de fotos de mascotas
        pets.forEach(pet => {
            if (pet.profile_picture) {
                totalSize += LIMITS.FILE_SIZE;
            }
            if (pet.photos) {
                totalSize += pet.photos.length * LIMITS.FILE_SIZE;
            }
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

// Limpiar archivos temporales
const cleanupUpload = (req, res, next) => {
    if (req.file) {
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error al eliminar archivo temporal:', err);
        });
    }
    if (req.files) {
        req.files.forEach(file => {
            fs.unlink(file.path, (err) => {
                if (err) console.error('Error al eliminar archivo temporal:', err);
            });
        });
    }
    next();
};

module.exports = {
    upload,
    handleUploadError,
    checkStorageLimit,
    cleanupUpload,
    LIMITS
}; 