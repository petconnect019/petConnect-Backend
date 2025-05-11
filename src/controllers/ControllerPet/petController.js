const mongoose = require('mongoose');
const PetModel = require('../../models/PetModel');
const { uploadToCloudinary, getOptimizedUrl, downloadFromCloudinary, getDownloadUrl, deleteFromCloudinary } = require('../../utils/cloudinary');
const PetData = require('../../data/petData');
const QRData = require('../../data/qrData');

const PetController = {
    createPet: async (req, res, next) => {
        try {
            const userId = req.user.id;
            const petData = { ...req.body, owner: userId };
    
            // Obtener imagen si se envió
            const photoBuffer = req.file?.buffer || null;
            const mimeType = req.file?.mimetype || null;
    
            // Crear la mascota en la base de datos
            const pet = await PetData.createPet(petData, photoBuffer, mimeType);
    
            res.status(201).json({
                ok: true,
                message: 'Mascota creada exitosamente',
                pet: pet.toObject(),
            });
        } catch (error) {
            console.error('Error al crear mascota:', error);
            next(error);
        }
    },

    getAllPets: async (req, res, next) => {
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
            next(error);
        }
    },

    getPetById: async (req, res, next) => {
        try {
            const id = req.params.id;
            
            // First try to get the pet directly
            const pet = await PetData.getPetById(id);
            
            if (pet) {
                return res.status(200).json({
                    ok: true,
                    pet
                });
            }
            
            // If pet not found, try to find a QR with this ID
            const QRModel = require('../../models/QRModel');
            const qr = await QRModel.findOne({ _id: id });
            
            if (qr) {
                if (qr.isLinked && qr.petId) {
                    // If QR is linked to a pet, redirect to that pet's public profile
                    return res.status(200).json({
                        ok: false,
                        redirect: `/public-pet-profile/${qr.petId}`,
                        message: 'Redirigiendo a la mascota vinculada'
                    });
                }
                
                // If QR exists but is not linked
                return res.status(200).json({
                    ok: false,
                    redirect: '/my-pets',
                    message: 'Este código QR no está vinculado a ninguna mascota'
                });
            }
            
            // If neither pet nor QR is found, return error
            return res.status(404).json({
                ok: false,
                redirect: '/',
                message: 'No se encontró la mascota ni el código QR'
            });
            
        } catch (error) {
            console.error('Error al obtener mascota:', error);
            return res.status(500).json({
                ok: false,
                redirect: '/',
                message: 'Error al procesar la solicitud'
            });
        }
    },

    updatePet: async (req, res, next) => {
        try {
            const petId = req.params.id;
            const userId = req.user.id;
            const updateData = req.body;
            
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
            
            const photos = req.files || [];
            const updatedPet = await PetData.updatePet(petId, updateData, photos);
            
            res.status(200).json({
                ok: true,
                message: 'Mascota actualizada exitosamente',
                pet: updatedPet
            });
        } catch (error) {
            console.error('Error al actualizar mascota:', error);
            next(error);
        }
    },

    deletePet: async (req, res, next) => {
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
                const error = new Error('No tienes permiso para eliminar esta mascota');
                error.statusCode = 403;
                return next(error);
            }
            
            await PetData.deletePet(petId);
            
            res.status(200).json({
                ok: true,
                message: 'Mascota eliminada exitosamente'
            });
        } catch (error) {
            console.error('Error al eliminar mascota:', error);
            next(error);
        }
    },

    getPetsByOwner: async (req, res, next) => {
        try {
            const ownerId = req.user.id;
            const pets = await PetData.getPetsByOwner(ownerId);
            
            res.status(200).json({
                ok: true,
                pets
            });
        } catch (error) {
            console.error('Error al obtener mascotas del usuario:', error);
            next(error);
        }
    },

    updatePetLocation: async (req, res, next) => {
        try {
            const petId = req.params.id;
            const userId = req.user.id;
            const locationData = req.body;
            
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
            
            const updatedPet = await PetData.updatePetLocation(petId, locationData);
            
            res.status(200).json({
                ok: true,
                message: 'Ubicación de la mascota actualizada exitosamente',
                pet: updatedPet
            });
        } catch (error) {
            console.error('Error al actualizar ubicación de la mascota:', error);
            next(error);
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
    },

    /**
     * Actualiza la ubicación de una mascota cuando se escanea su QR
     * Esta ruta es pública y no requiere autenticación
     */
    scanQRCode: async (req, res) => {
        try {
            const petId = req.params.id;
            const locationData = req.body;

            // Verificar que la mascota existe
            const pet = await PetData.getPetById(petId);
            if (!pet) {
                return res.status(404).json({
                    ok: false,
                    message: 'Mascota no encontrada'
                });
            }

            // Validar datos de ubicación
            if (!locationData.latitude || !locationData.longitude) {
                return res.status(400).json({
                    ok: false,
                    message: 'La latitud y longitud son requeridas'
                });
            }

            // Actualizar la ubicación de la mascota
            const updatedPet = await PetData.updatePetLocation(petId, locationData);

            res.status(200).json({
                ok: true,
                message: 'Ubicación actualizada exitosamente',
                pet: {
                    id: updatedPet._id,
                    name: updatedPet.name,
                    lastSeenLocation: updatedPet.lastSeenLocation
                }
            });
        } catch (error) {
            console.error('Error al escanear QR:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al actualizar la ubicación',
                error: error.message
            });
        }
    }
};

module.exports = PetController;
