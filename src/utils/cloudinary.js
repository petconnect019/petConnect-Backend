const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');
const path = require('path');

// Configuración
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Función para extraer el public_id de una URL de Cloudinary
const getPublicIdFromUrl = (url) => {
    try {
        if (!url) return null;
        // Extraer el public_id de la URL
        const splitUrl = url.split('/');
        const filename = splitUrl[splitUrl.length - 1];
        // Remover la extensión del archivo
        const publicId = filename.split('.')[0];
        // Si la imagen está en una carpeta, incluir la carpeta en el public_id
        const folderName = splitUrl[splitUrl.length - 2];
        return folderName === 'upload' ? publicId : `${folderName}/${publicId}`;
    } catch (error) {
        console.error('Error al extraer public_id:', error);
        return null;
    }
};

// Función para eliminar una imagen de Cloudinary
const deleteFromCloudinary = async (url) => {
    try {
        if (!url) return null;
        const publicId = getPublicIdFromUrl(url);
        if (!publicId) return null;

        console.log('Intentando eliminar imagen con public_id:', publicId);
        const result = await cloudinary.uploader.destroy(publicId);
        console.log('Resultado de eliminación:', result);
        return result;
    } catch (error) {
        console.error('Error al eliminar imagen de Cloudinary:', error);
        throw error;
    }
};

const uploadToCloudinary = async (filePath) => {
    try {
        console.log('Iniciando carga a Cloudinary:', filePath);
        
        // Verificar que el archivo existe
        if (!fs.existsSync(filePath)) {
            console.error('El archivo no existe en la ruta especificada:', filePath);
            throw new Error('El archivo no existe en la ruta especificada');
        }

        // Verificar que Cloudinary está configurado correctamente
        if (!process.env.CLOUDINARY_CLOUD_NAME || 
            !process.env.CLOUDINARY_API_KEY || 
            !process.env.CLOUDINARY_API_SECRET) {
            console.error('Configuración de Cloudinary incompleta');
            throw new Error('Configuración de Cloudinary incompleta');
        }

        console.log('Configuración de Cloudinary:', {
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY ? 'Configurado' : 'No configurado',
            api_secret: process.env.CLOUDINARY_API_SECRET ? 'Configurado' : 'No configurado'
        });

        // Upload con optimización
        const result = await cloudinary.uploader.upload(filePath, {
            folder: 'pet_profile_pictures',
            fetch_format: 'auto',
            quality: 'auto',
            transformation: [
                { width: 1000, crop: 'limit' }, // limita el ancho máximo
                { quality: 'auto' }, // optimización automática de calidad
                { fetch_format: 'auto' } // formato automático
            ]
        });

        console.log('Imagen subida exitosamente a Cloudinary:', result.secure_url);
        
        // Eliminar el archivo temporal después de subirlo
        try {
            fs.unlinkSync(filePath);
            console.log('Archivo temporal eliminado:', filePath);
        } catch (unlinkError) {
            console.error('Error al eliminar archivo temporal:', unlinkError);
            // No lanzamos error aquí para no interrumpir el flujo principal
        }

        return result;
    } catch (error) {
        console.error('Error detallado al subir a Cloudinary:', error);
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
        fetch_format: 'auto' 
    });
};

module.exports = {
    uploadToCloudinary,
    deleteFromCloudinary,
    getPublicIdFromUrl,
    getOptimizedUrl,
    getSquareImageUrl,
    downloadFromCloudinary,
    getDownloadUrl
}; 