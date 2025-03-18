const mongoose = require('mongoose');
const PetModel = require('../../models/PetModel');
const { uploadToCloudinary, getOptimizedUrl, downloadFromCloudinary, getDownloadUrl, deleteFromCloudinary } = require('../../utils/cloudinary');
const PetData = require('../../data/petData');
const QRData = require('../../data/qrData');

const PetController = {
    createPet: async (req, res) => {
        try {
            const userId = req.user.id;
            const { name, gender, species, breed, color, birthDate, description } = req.body;
    
            // Validar datos básicos requeridos
            if (!name) {
                return res.status(400).json({
                    ok: false,
                    message: 'El nombre es obligatorio'
                });
            }
    
            // Validar formato de fecha
            const isValidDate = birthDate ? !isNaN(new Date(birthDate).getTime()) : true;
            if (birthDate && !isValidDate) {
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
                birthDate: birthDate ? new Date(birthDate) : null,
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

    // Obtener perfil público de mascota
    getPublicProfile: async (req, res) => {
        try {
            const { petId } = req.params;
            const petProfile = await PetData.getPublicProfile(petId);
            
            res.json({
                success: true,
                pet: petProfile
            });
        } catch (error) {
            console.error('Error al obtener perfil público de mascota:', error);
            
            if (error.message === 'Mascota no encontrada') {
                return res.status(404).json({
                    success: false,
                    message: 'Mascota no encontrada'
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Error al obtener el perfil público de la mascota',
                error: error.message
            });
        }
    }
};

module.exports = PetController;
