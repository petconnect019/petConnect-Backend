/**
 * Controlador para manejar la foto de perfil de las mascotas
 */ 

const PetData = require('../../data/petData');

const ProfilePictureController = {
    getProfilePicture: async (req, res, next) => {
        try {
            const petId = req.params.id;
            const pet = await PetData.getPetById(petId);
            
            if (!pet) {
                const error = new Error('Mascota no encontrada');
                error.statusCode = 404;
                return next(error);
            }
            
            if (!pet.profile_picture) {
                const error = new Error('La mascota no tiene foto de perfil');
                error.statusCode = 404;
                return next(error);
            }
            
            res.status(200).json({
                ok: true,
                profile_picture: pet.profile_picture
            });
        } catch (error) {
            console.error('Error al obtener foto de perfil:', error);
            next(error);
        }
    },

    updatePetProfilePicture: async (req, res, next) => {
        try {
            const petId = req.params.id;
            const userId = req.user.id;
            
            // Verificar que la mascota existe y pertenece al usuario
            const pet = await PetData.getPetById(petId);
            if (!pet) {
                const error = new Error('Mascota no encontrada');
                error.statusCode = 404;
                return next(error);
            }
            
            if (req.user.role !== 'admin' && pet.owner._id.toString() !== userId) {
                const error = new Error('No tienes permiso para actualizar esta mascota');
                error.statusCode = 403;
                return next(error);
            }
            
            if (!req.file) {
                const error = new Error('No se ha proporcionado ninguna imagen');
                error.statusCode = 400;
                return next(error);
            }
            
            const profilePictureUrl = await PetData.updatePetProfilePicture(
                petId, 
                req.file.buffer, 
                req.file.mimetype
            );
            
            res.status(200).json({
                ok: true,
                message: 'Foto de perfil actualizada exitosamente',
                profile_picture: profilePictureUrl
            });
            
        } catch (error) {
            console.error('Error al actualizar foto de perfil:', error);
            next(error);
        }
    },

    removeProfilePicture: async (req, res, next) => {
        try {
            const petId = req.params.id;
            const userId = req.user.id;
            
            // Verificar que la mascota existe y pertenece al usuario
            const pet = await PetData.getPetById(petId);
            
            if (!pet) {
                const error = new Error('Mascota no encontrada');
                error.statusCode = 404;
                return next(error);
            }
            
            if (pet.owner._id.toString() !== userId && req.user.role !== 'admin') {
                const error = new Error('No tienes permiso para actualizar esta mascota');
                error.statusCode = 403;
                return next(error);
            }
            
            await PetData.removeProfilePicture(petId);
            
            res.status(200).json({
                ok: true,
                message: 'Foto de perfil eliminada exitosamente'
            });
        } catch (error) {
            console.error('Error al eliminar foto de perfil:', error);
            next(error);
        }
    },

    downloadProfilePicture: async (req, res, next) => {
        try {
            const petId = req.params.id;
            const pet = await PetData.getPetById(petId);
            
            if (!pet) {
                const error = new Error('Mascota no encontrada');
                error.statusCode = 404;
                return next(error);
            }
            
            if (!pet.profile_picture) {
                const error = new Error('La mascota no tiene foto de perfil');
                error.statusCode = 404;
                return next(error);
            }
            
            // Redirigir a la URL de descarga
            res.redirect(pet.profile_picture);
        } catch (error) {
            console.error('Error al descargar foto de perfil:', error);
            next(error);
        }
    }
};

module.exports = ProfilePictureController; 