/**
 * Controlador para manejar las fotos de las mascotas adicionales
 */

const PetData = require('../../data/petData');

const PhotoController = {
    // Obtener fotos de una mascota
    getPetPhotos: async (req, res, next) => {
        try {
            const petId = req.params.id;
            const pet = await PetData.getPetById(petId);
            
            if (!pet) {
                const error = new Error('Mascota no encontrada');
                error.statusCode = 404;
                return next(error);
            }
            
            // Formatear las fotos para el frontend
            const formattedPhotos = (pet.photos || []).map((photoUrl, index) => ({
                _id: `photo_${index}`,
                url: photoUrl
            }));
            
            res.status(200).json({
                ok: true,
                photos: formattedPhotos
            });
        } catch (error) {
            console.error('Error al obtener fotos:', error);
            next(error);
        }
    },

    addPetPhotos: async (req, res, next) => {
        try {
            const petId = req.params.id;
            
            if (!req.files || req.files.length === 0) {
                const error = new Error('No se han proporcionado imágenes');
                error.statusCode = 400;
                return next(error);
            }
            const photoUrls = await PetData.addPetPhotos(petId, req.files);
    
            // Formatear las fotos para el frontend
            const formattedPhotos = photoUrls.map((photoUrl, index) => ({
                _id: `photo_${Date.now()}_${index}`,
                url: photoUrl
            }));
    
            res.status(200).json({
                ok: true,
                message: 'Fotos añadidas exitosamente',
                photos: formattedPhotos
            });
            
        } catch (error) {
            console.error('Error al añadir fotos:', error);
            next(error);
        }
    },

    deletePetPhoto: async (req, res, next) => {
        try {
            const petId = req.params.id;
            const photoId = req.params.photoId;
            
            // Si el photoId es un índice (photo_0, photo_1, etc.), convertirlo a índice numérico
            let photoIndex = null;
            if (photoId.startsWith('photo_')) {
                photoIndex = parseInt(photoId.replace('photo_', ''));
            } else {
                // Si es una URL, decodificarla
                const photoUrl = decodeURIComponent(photoId);
                await PetData.deletePetPhoto(petId, photoUrl);
            }
            
            // Si es un índice, eliminar por posición
            if (photoIndex !== null) {
                await PetData.deletePetPhotoByIndex(petId, photoIndex);
            }
            
            res.status(200).json({
                ok: true,
                message: 'Foto eliminada exitosamente'
            });
        } catch (error) {
            console.error('Error al eliminar foto:', error);
            next(error);
        }
    },

    downloadPetPhoto: async (req, res, next) => {
        try {
            const photoId = req.params.photoId;
            
            // Redirigir a la URL de la foto
            res.redirect(photoId);
        } catch (error) {
            console.error('Error al descargar foto:', error);
            next(error);
        }
    },

    downloadAllPhotos: async (req, res, next) => {
        try {
            const petId = req.params.id;
            const pet = await PetData.getPetById(petId);
            
            if (!pet) {
                const error = new Error('Mascota no encontrada');
                error.statusCode = 404;
                return next(error);
            }
            
            if (!pet.photos || pet.photos.length === 0) {
                const error = new Error('La mascota no tiene fotos adicionales');
                error.statusCode = 404;
                return next(error);
            }
            
            res.status(200).json({
                ok: true,
                photos: pet.photos
            });
        } catch (error) {
            console.error('Error al descargar fotos:', error);
            next(error);
        }
    }
};

module.exports = PhotoController; 