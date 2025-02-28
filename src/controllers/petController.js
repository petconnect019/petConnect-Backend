const mongoose = require('mongoose');
const PetModel = require('../models/PetModel');
const { uploadToCloudinary, getOptimizedUrl, downloadFromCloudinary, getDownloadUrl } = require('../utils/cloudinary');

const PetController = {
    createPet: async (req, res) => {
        try {
            const userId = req.user.id;
            const { name, gender, species, breed, age, description } = req.body;

            // Validar datos básicos requeridos
            if (!name || !gender) {
                return res.status(400).json({
                    ok: false,
                    message: 'El nombre y género de la mascota son obligatorios'
                });
            }

            // Crear objeto con datos básicos
            const petData = {
                owner: userId,
                name,
                gender,
            };

            // Si hay fotos, procesarlas
            if (req.files && req.files.length > 0) {
                const uploadPromises = req.files.map(file => uploadToCloudinary(file.path));
                const uploadResults = await Promise.all(uploadPromises);
                petData.photos = uploadResults.map(result => result.secure_url);
            }

            // Crear la mascota
            const pet = new PetModel(petData);
            await pet.save();

            res.status(201).json({
                ok: true,
                message: 'Mascota creada exitosamente',
                pet
            });

        } catch (error) {
            console.error('Error al crear mascota:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al crear la mascota'
            });
        }
    },

    getAllPets: async (req, res) => {
        try {
            const pets = await PetModel.find()
                .populate('owner', 'name email profile_picture');
            res.status(200).json({
                ok: true,
                pets
            });
        } catch (error) {
            console.error('Error al obtener mascotas:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al obtener mascotas'
            });
        }
    },

    getPetById: async (req, res) => {
        try {
            const pet = await PetModel.findById(req.params.id)
                .populate('owner', 'name email profile_picture');

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
                message: 'Error al obtener mascota'
            });
        }
    },

    updatePet: async (req, res) => {
        try {
            const petId = req.params.id;
            const userId = req.user.id;

            // Verificar si el ID es válido
            if (!mongoose.Types.ObjectId.isValid(petId)) {
                return res.status(400).json({
                    ok: false,
                    message: 'ID de mascota no válido'
                });
            }

            // Buscar la mascota y verificar que el usuario es el dueño
            const pet = await PetModel.findOne({ _id: petId, owner: userId });
            if (!pet) {
                return res.status(404).json({
                    ok: false,
                    message: 'Mascota no encontrada o no autorizado'
                });
            }

            // Actualizar datos básicos
            const updateData = { ...req.body };
            delete updateData.photos; // Eliminar fotos del objeto de actualización

            // Si hay nuevas fotos, procesarlas
            if (req.files && req.files.length > 0) {
                const uploadPromises = req.files.map(file => uploadToCloudinary(file.path));
                const uploadResults = await Promise.all(uploadPromises);
                const newPhotos = uploadResults.map(result => result.secure_url);
                updateData.photos = [...pet.photos, ...newPhotos];
            }

            // Actualizar la mascota
            const updatedPet = await PetModel.findByIdAndUpdate(
                petId,
                updateData,
                { new: true }
            ).populate('owner', 'name email profile_picture');

            res.status(200).json({
                ok: true,
                message: 'Mascota actualizada exitosamente',
                pet: updatedPet
            });

        } catch (error) {
            console.error('Error al actualizar mascota:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al actualizar la mascota'
            });
        }
    },

    deletePet: async (req, res) => {
        try {
            const petId = req.params.id;
            const userId = req.user.id;

            const pet = await PetModel.findOneAndDelete({ _id: petId, owner: userId });

            if (!pet) {
                return res.status(404).json({
                    ok: false,
                    message: 'Mascota no encontrada o no autorizado'
                });
            }

            res.status(200).json({
                ok: true,
                message: 'Mascota eliminada exitosamente'
            });
        } catch (error) {
            console.error('Error al eliminar mascota:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al eliminar la mascota'
            });
        }
    },

    getPetsByOwner: async (req, res) => {
        try {
            const userId = req.user.id;
            const pets = await PetModel.find({ owner: userId })
                .populate('owner', 'name email profile_picture');

            res.status(200).json({
                ok: true,
                pets
            });
        } catch (error) {
            console.error('Error al obtener mascotas del usuario:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al obtener mascotas del usuario'
            });
        }
    },

    addPetPhotos: async (req, res) => {
        try {
            const petId = req.params.id;
            const userId = req.user.id;

            // Verificar si la mascota existe y pertenece al usuario
            const pet = await PetModel.findOne({ _id: petId, owner: userId });
            if (!pet) {
                return res.status(404).json({
                    ok: false,
                    message: 'Mascota no encontrada o no autorizado'
                });
            }

            // Procesar y subir las nuevas fotos
            if (req.files && req.files.length > 0) {
                const uploadPromises = req.files.map(file => uploadToCloudinary(file.path));
                const uploadResults = await Promise.all(uploadPromises);
                const newPhotos = uploadResults.map(result => result.secure_url);

                // Añadir las nuevas fotos al array existente
                pet.photos = [...pet.photos, ...newPhotos];
                await pet.save();

                return res.status(200).json({
                    ok: true,
                    message: 'Fotos añadidas exitosamente',
                    photos: pet.photos
                });
            }

            return res.status(400).json({
                ok: false,
                message: 'No se proporcionaron fotos'
            });

        } catch (error) {
            console.error('Error al añadir fotos:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al procesar las fotos'
            });
        }
    },

    deletePetPhoto: async (req, res) => {
        try {
            const { id, photoId } = req.params;
            const userId = req.user.id;

            // Verificar si la mascota existe y pertenece al usuario
            const pet = await PetModel.findOne({ _id: id, owner: userId });
            if (!pet) {
                return res.status(404).json({
                    ok: false,
                    message: 'Mascota no encontrada o no autorizado'
                });
            }

            // Eliminar la foto del array
            pet.photos = pet.photos.filter(photo => !photo.includes(photoId));
            await pet.save();

            res.status(200).json({
                ok: true,
                message: 'Foto eliminada exitosamente',
                photos: pet.photos
            });

        } catch (error) {
            console.error('Error al eliminar foto:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al eliminar la foto'
            });
        }
    },

    downloadPetPhoto: async (req, res) => {
        try {
            const { photoId } = req.params;
            
            // Obtener URL de descarga directa
            const downloadUrl = getDownloadUrl(photoId);
            res.json({
                ok: true,
                downloadUrl
            });
            
        } catch (error) {
            console.error('Error al descargar foto:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al descargar foto'
            });
        }
    },

    updatePetStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const userId = req.user.id;

            // Verificar si el estado es válido
            const validStatuses = ['available', 'adopted', 'lost', 'found'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    ok: false,
                    message: 'Estado no válido'
                });
            }

            // Actualizar el estado de la mascota
            const pet = await PetModel.findOneAndUpdate(
                { _id: id, owner: userId },
                { status },
                { new: true }
            );

            if (!pet) {
                return res.status(404).json({
                    ok: false,
                    message: 'Mascota no encontrada o no autorizado'
                });
            }

            res.status(200).json({
                ok: true,
                message: 'Estado actualizado exitosamente',
                pet
            });

        } catch (error) {
            console.error('Error al actualizar estado:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al actualizar el estado'
            });
        }
    },

    updatePetLocation: async (req, res) => {
        try {
            const { id } = req.params;
            const { city, address, coordinates } = req.body;
            const userId = req.user.id;

            // Actualizar la ubicación de la mascota
            const pet = await PetModel.findOneAndUpdate(
                { _id: id, owner: userId },
                { 
                    location: {
                        city,
                        address,
                        coordinates
                    }
                },
                { new: true }
            );

            if (!pet) {
                return res.status(404).json({
                    ok: false,
                    message: 'Mascota no encontrada o no autorizado'
                });
            }

            res.status(200).json({
                ok: true,
                message: 'Ubicación actualizada exitosamente',
                pet
            });

        } catch (error) {
            console.error('Error al actualizar ubicación:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al actualizar la ubicación'
            });
        }
    }
};

module.exports = PetController;
