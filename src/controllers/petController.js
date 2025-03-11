const mongoose = require('mongoose');
const PetModel = require('../models/PetModel');
const { uploadToCloudinary, getOptimizedUrl, downloadFromCloudinary, getDownloadUrl, deleteFromCloudinary } = require('../utils/cloudinary');
const PetData = require('../data/petData');
const QRData = require('../data/qrData');

const PetController = {
    createPet: async (req, res) => {
        try {
            const userId = req.user.id;
            const { name, gender, species, breed, color, birthDate, description } = req.body;
    
            // Validar datos básicos requeridos
            if (!name || !birthDate) {
                return res.status(400).json({
                    ok: false,
                    message: 'El nombre y la fecha de nacimiento son obligatorios'
                });
            }
    
            // Validar formato de fecha
            const isValidDate = !isNaN(new Date(birthDate).getTime());
            if (!isValidDate) {
                return res.status(400).json({
                    ok: false,
                    message: 'Formato de fecha inválido'
                });
            }
    
            // Crear objeto con datos básicos
            const petData = {
                owner: userId,
                name,
                gender: gender || 'No especificado',
                species: species || 'No especificado',
                breed: breed || 'No especificado',
                color: color || 'No especificado',
                birthDate: new Date(birthDate),
                description: description || ''
            };
    
            const photoBuffer = req.file ? req.file.buffer : null;
            const mimeType = req.file ? req.file.mimetype : null;
            
            const pet = await PetData.createPet(petData, photoBuffer, mimeType);

            res.status(201).json({
                ok: true,
                message: 'Mascota creada exitosamente',
                pet: pet.toObject()
            });
    
        } catch (error) {
            console.error('Error al crear mascota:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al crear la mascota',
                error: error.message
            });
        }
    },

    getAllPets: async (req, res) => {
        try {
            const { page = 1, limit = 10, species, gender, status, city } = req.query;
            const filters = { species, gender, status, city };
            
            const result = await PetData.getAllPets(filters, page, limit);
            
            res.status(200).json({
                ok: true,
                ...result
            });
        } catch (error) {
            console.error('Error al obtener mascotas:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al obtener mascotas',
                error: error.message
            });
        }
    },

    getPetById: async (req, res) => {
        try {
            const petId = req.params.id;
            const pet = await PetData.getPetById(petId);

            if (!pet) {
                return res.status(404).json({
                    ok: false,
                    message: 'Mascota no encontrada'
                });
            }
            
            res.status(200).json({
                ok: true,
                pet
            });
        } catch (error) {
            console.error('Error al obtener mascota:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al obtener mascota',
                error: error.message
            });
        }
    },

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

    updatePet: async (req, res) => {
        try {
            const petId = req.params.id;
            const userId = req.user.id;
            const updateData = req.body;
            
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
            
            const photos = req.files || [];
            const updatedPet = await PetData.updatePet(petId, updateData, photos);
            
            res.status(200).json({
                ok: true,
                message: 'Mascota actualizada exitosamente',
                pet: updatedPet
            });
        } catch (error) {
            console.error('Error al actualizar mascota:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al actualizar la mascota',
                error: error.message
            });
        }
    },

    deletePet: async (req, res) => {
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
                    message: 'No tienes permiso para eliminar esta mascota'
                });
            }
            
            await PetData.deletePet(petId);
            
            res.status(200).json({
                ok: true,
                message: 'Mascota eliminada exitosamente'
            });
        } catch (error) {
            console.error('Error al eliminar mascota:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al eliminar la mascota',
                error: error.message
            });
        }
    },

    getPetsByOwner: async (req, res) => {
        try {
            const ownerId = req.user.id;
            const pets = await PetData.getPetsByOwner(ownerId);
            
            res.status(200).json({
                ok: true,
                pets
            });
        } catch (error) {
            console.error('Error al obtener mascotas del usuario:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al obtener mascotas del usuario',
                error: error.message
            });
        }
    },

    addPetPhotos: async (req, res) => {
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

            if (pet.owner.toString() !== userId) {
                return res.status(403).json({
                    ok: false,
                    message: 'No tienes permiso para actualizar esta mascota'
                });
            }
            
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
            const photoId = req.params.photoId;
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
            
            await PetData.deletePetPhoto(petId, photoId);
            
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

    updatePetStatus: async (req, res) => {
        try {
            const petId = req.params.id;
            const userId = req.user.id;
            const { status } = req.body;
            
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
            
            const updatedPet = await PetData.updatePetStatus(petId, status);
            
            res.status(200).json({
                ok: true,
                message: 'Estado actualizado exitosamente',
                pet: updatedPet
            });
        } catch (error) {
            console.error('Error al actualizar estado:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al actualizar el estado',
                error: error.message
            });
        }
    },

    updatePetLocation: async (req, res) => {
        try {
            const petId = req.params.id;
            const userId = req.user.id;
            const locationData = req.body;
            
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
            
            const updatedPet = await PetData.updatePetLocation(petId, locationData);
            
            res.status(200).json({
                ok: true,
                message: 'Ubicación actualizada exitosamente',
                pet: updatedPet
            });
        } catch (error) {
            console.error('Error al actualizar ubicación:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al actualizar la ubicación',
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
            
            if (pet.owner.toString() !== userId) {
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
    },

    /**
     * Crea una mascota y la vincula a un código QR
     */
    createPetWithQR: async (req, res) => {
        try {
            const userId = req.user.id;
            const { name, gender, species, breed, color, birthDate, description, qrId } = req.body;

            // Validaciones básicas
            if (!name || !birthDate) {
                return res.status(400).json({
                    ok: false,
                    message: 'El nombre y la fecha de nacimiento son obligatorios'
                });
            }

            const petData = {
                owner: userId,
                name,
                gender: gender || 'No especificado',
                species: species || 'No especificado',
                breed: breed || 'No especificado',
                color: color || 'No especificado',
                birthDate: new Date(birthDate),
                description: description || ''
            };

            const photoBuffer = req.file ? req.file.buffer : null;
            const mimeType = req.file ? req.file.mimetype : null;
            
            // Crear la mascota
            const pet = await PetData.createPet(petData, photoBuffer, mimeType);

            // Si se proporcionó un qrId, vincular la mascota al código QR
            if (qrId) {
                try {
                    await QRData.linkQRToPet(qrId, pet._id);
                } catch (qrError) {
                    console.error('Error al vincular QR:', qrError);
                    // No fallamos la creación de la mascota si hay un error con el QR
                }
            }

            res.status(201).json({
                ok: true,
                message: 'Mascota creada exitosamente',
                pet: pet.toObject(),
                qrLinked: !!qrId
            });

        } catch (error) {
            console.error('Error al crear mascota:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al crear la mascota',
                error: error.message
            });
        }
    }
};

module.exports = PetController;
