
/**
 * Controlador para manejar la foto de perfil de las mascotas
 */ 

const PetData = require('../../data/petData');

const ProfilePictureController = {
    getProfilePicture: async (req, res) => {
        try {
            const petId = req.params.id;
            const pet = await PetData.getPetById(petId);
            
            if (!pet) {
                return res.status(404).json({
                    ok: false,
                    message: 'Mascota no encontrada'
                });
            }
            
            if (!pet.profile_picture) {
                return res.status(404).json({
                    ok: false,
                    message: 'La mascota no tiene foto de perfil'
                });
            }
            
            res.status(200).json({
                ok: true,
                profile_picture: pet.profile_picture
            });
        } catch (error) {
            console.error('Error al obtener foto de perfil:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al obtener la foto de perfil',
                error: error.message
            });
        }
    },

    updatePetProfilePicture: async (req, res) => {
        try {
            const petId = req.params.id;
            const userId = req.user.id;
            
            // Verificar que la mascota existe y pertenece al usuario
            const pet = await PetData.getPetById(petId);
            if (!pet) {
                return res.status(404).json({
                    ok: false,
                    message: 'Mascota no encontrada'
                });
            }
            
            if (req.user.role !== 'admin' && pet.owner._id.toString() !== userId) {
                return res.status(403).json({
                    ok: false,
                    message: 'No tienes permiso para actualizar esta mascota'
                });
            }
            
            if (!req.file) {
                return res.status(400).json({
                    ok: false,
                    message: 'No se ha proporcionado ninguna imagen'
                });
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
            res.status(500).json({
                ok: false,
                message: 'Error al actualizar la foto de perfil',
                error: error.message
            });
        }
    },

    removeProfilePicture: async (req, res) => {
        try {
            const petId = req.params.id;
            const userId = req.user.id;
            
            // Verificar que la mascota existe y pertenece al usuario
            const pet = await PetData.getPetById(petId);
            
            if (!pet) {
                return res.status(404).json({
                    ok: false,
                    message: 'Mascota no encontrada'
                });
            }
            
            if (pet.owner._id.toString() !== userId && req.user.role !== 'admin') {
                return res.status(403).json({
                    ok: false,
                    message: 'No tienes permiso para actualizar esta mascota'
                });
            }
            
            await PetData.removeProfilePicture(petId);
            
            res.status(200).json({
                ok: true,
                message: 'Foto de perfil eliminada exitosamente'
            });
        } catch (error) {
            console.error('Error al eliminar foto de perfil:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al eliminar la foto de perfil',
                error: error.message
            });
        }
    },

    downloadProfilePicture: async (req, res) => {
        try {
            const petId = req.params.id;
            const pet = await PetData.getPetById(petId);
            
            if (!pet) {
                return res.status(404).json({
                    ok: false,
                    message: 'Mascota no encontrada'
                });
            }
            
            if (!pet.profile_picture) {
                return res.status(404).json({
                    ok: false,
                    message: 'La mascota no tiene foto de perfil'
                });
            }
            
            // Redirigir a la URL de descarga
            res.redirect(pet.profile_picture);
        } catch (error) {
            console.error('Error al descargar foto de perfil:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al descargar la foto de perfil',
                error: error.message
            });
        }
    }
};

module.exports = ProfilePictureController; 