const mongoose = require('mongoose');
const PetModel = require('../models/PetModel');
const { uploadToCloudinary } = require('../utils/cloudinary');

const PetController = {
    createPet: async (req, res) => {
        try {
            const { name, species, breed, age, description, status } = req.body;
            const owner = req.user.id;

            let photos = [];
            if (req.files) {
                for (const file of req.files) {
                    const result = await uploadToCloudinary(file.path);
                    photos.push(result.secure_url);
                }
            }

            const pet = new PetModel({
                name,
                species,
                breed,
                age,
                description,
                photos,
                owner,
                status,
                location: {
                    city: req.body.city,
                    address: req.body.address,
                    coordinates: {
                        latitude: req.body.latitude,
                        longitude: req.body.longitude
                    }
                }
            });

            await pet.save();
            console.log('Mascota creada:', pet);
            res.status(201).json(pet);
        } catch (error) {
            console.error('Error al crear mascota:', error);
            res.status(500).json({ message: 'Error al crear mascota' });
        }
    },

    getAllPets: async (req, res) => {
        try {
            const pets = await PetModel.find()
                .populate('owner', 'name email profile_picture');
            console.log('Mascotas obtenidas:', pets);
            res.status(200).json(pets);
        } catch (error) {
            console.error('Error al obtener mascotas:', error);
            res.status(500).json({ message: 'Error al obtener mascotas' });
        }
    },

    getPetById: async (req, res) => {
        try {
            const pet = await PetModel.findById(req.params.id)
                .populate('owner', 'name email profile_picture');

            if (!pet) {
                return res.status(404).json({ message: 'Mascota no encontrada' });
            }

            console.log('Mascota obtenida:', pet);
            res.status(200).json(pet);
        } catch (error) {
            console.error('Error al obtener mascota:', error);
            res.status(500).json({ message: 'Error al obtener mascota' });
        }
    },

    deletePet: async (req, res) => {
        try {
            const pet = await PetModel.findByIdAndDelete(req.params.id);

            if (!pet) {
                return res.status(404).json({ message: 'Mascota no encontrada' });
            }

            console.log('Mascota eliminada:', pet);
            res.status(200).json({ message: 'Mascota eliminada exitosamente' });
        } catch (error) {
            console.error('Error al eliminar mascota:', error);
            res.status(500).json({ message: 'Error al eliminar mascota' });
        }
    },

    getPetsByOwner: async (req, res) => {
        try {
            const ownerId = req.user.id; // Asegúrate de que el middleware de autenticación añade el ID del usuario al objeto req
            const pets = await PetModel.find({ owner: ownerId })
                .populate('owner', 'name email profile_picture');

            if (!pets || pets.length === 0) {
                return res.status(404).json({ message: 'No se encontraron mascotas para este usuario' });
            }

            res.status(200).json(pets);
        } catch (error) {
            console.error('Error al obtener mascotas del usuario:', error);
            res.status(500).json({ message: 'Error al obtener mascotas del usuario' });
        }
    },

    updatePet: async (req, res) => {
        try {
            const petId = req.params.id;
            const userId = req.user.id; // Asumiendo que el middleware de autenticación añade el ID del usuario al objeto req

            // Verificar si el ID es válido
            if (!mongoose.Types.ObjectId.isValid(petId)) {
                return res.status(400).json({ message: 'ID de mascota no válido' });
            }

            // Buscar la mascota y verificar que el usuario es el dueño
            const pet = await PetModel.findById(petId);
            if (!pet) {
                return res.status(404).json({ message: 'Mascota no encontrada' });
            }

            if (pet.owner.toString() !== userId) {
                return res.status(403).json({ message: 'No autorizado para actualizar esta mascota' });
            }

            // Filtrar datos vacíos
            const updateData = {};
            Object.entries(req.body).forEach(([key, value]) => {
                if (value !== undefined && value !== '') {
                    updateData[key] = value;
                }
            });

            // Actualizar la mascota
            const updatedPet = await PetModel.findByIdAndUpdate(petId, { $set: updateData }, { new: true, runValidators: true })
                .populate('owner', 'name email profile_picture');

            res.status(200).json(updatedPet);

        } catch (error) {
            res.status(500).json({ message: 'Error al actualizar la mascota', error: error.message });
        }
    }
};

module.exports = PetController;
