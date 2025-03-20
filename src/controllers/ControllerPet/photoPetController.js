/**
 * Controlador para manejar las fotos de las mascotas adicionales
 */

const PetData = require('../../data/petData');

const PhotoController = {
    addPetPhotos: async (req, res) => {
        try {
            const petId = req.params.id;
            
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    ok: false,
                    message: 'No se han proporcionado imágenes'
                });
            }
            const photoUrls = await PetData.addPetPhotos(petId, req.files);
    
            res.status(200).json({
                ok: true,
                message: 'Fotos añadidas exitosamente',
                photos: photoUrls
            });
            
        } catch (error) {
            console.error('Error al añadir fotos:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al añadir fotos',
                error: error.message
            });
        }
    },

    deletePetPhoto: async (req, res) => {
        try {
            const petId = req.params.id;
            const photoUrl = decodeURIComponent(req.params.photoId);
            
            await PetData.deletePetPhoto(petId, photoUrl);
            
            res.status(200).json({
                ok: true,
                message: 'Foto eliminada exitosamente'
            });
        } catch (error) {
            console.error('Error al eliminar foto:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al eliminar la foto',
                error: error.message
            });
        }
    },

    downloadPetPhoto: async (req, res) => {
        try {
            const photoId = req.params.photoId;
            
            // Redirigir a la URL de la foto
            res.redirect(photoId);
        } catch (error) {
            console.error('Error al descargar foto:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al descargar la foto',
                error: error.message
            });
        }
    },

    downloadAllPhotos: async (req, res) => {
        try {
            const petId = req.params.id;
            const pet = await PetData.getPetById(petId);
            
            if (!pet) {
                return res.status(404).json({
                    ok: false,
                    message: 'Mascota no encontrada'
                });
            }
            
            if (!pet.photos || pet.photos.length === 0) {
                return res.status(404).json({
                    ok: false,
                    message: 'La mascota no tiene fotos adicionales'
                });
            }
            
            res.status(200).json({
                ok: true,
                photos: pet.photos
            });
        } catch (error) {
            console.error('Error al descargar fotos:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al descargar las fotos',
                error: error.message
            });
        }
    }
};

module.exports = PhotoController; 