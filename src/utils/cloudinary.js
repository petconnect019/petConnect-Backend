const { v2: cloudinary } = require('cloudinary');

// Configuración
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadToCloudinary = async (filePath) => {
    try {
        // Upload con optimización
        const result = await cloudinary.uploader.upload(filePath, {
            fetch_format: 'auto',
            quality: 'auto',
            transformation: [
                { width: 1000, crop: 'limit' }, // limita el ancho máximo
                { quality: 'auto' }, // optimización automática de calidad
                { fetch_format: 'auto' } // formato automático
            ]
        });
        return result;
    } catch (error) {
        console.error('Error al subir a Cloudinary:', error);
        throw error;
    }
};

// Función para generar URL optimizada
const getOptimizedUrl = (publicId) => {
    return cloudinary.url(publicId, {
        fetch_format: 'auto',
        quality: 'auto'
    });
};

// Función para transformar imagen a cuadrada
const getSquareImageUrl = (publicId, size = 500) => {
    return cloudinary.url(publicId, {
        crop: 'fill',
        gravity: 'auto',
        width: size,
        height: size,
        fetch_format: 'auto',
        quality: 'auto'
    });
};

// Función para descargar imagen de Cloudinary
const downloadFromCloudinary = async (publicId) => {
    try {
        // Generar URL de descarga
        const result = await cloudinary.utils.download_zip_url({
            public_ids: [publicId],
            resource_type: 'image'
        });

        return result;
    } catch (error) {
        console.error('Error al descargar de Cloudinary:', error);
        throw error;
    }
};

// Función para obtener URL de descarga directa
const getDownloadUrl = (publicId) => {
    return cloudinary.url(publicId, {
        flags: 'attachment',
        format: 'jpg' // o el formato que prefieras
    });
};

module.exports = {
    uploadToCloudinary,
    getOptimizedUrl,
    getSquareImageUrl,
    downloadFromCloudinary,
    getDownloadUrl
}; 