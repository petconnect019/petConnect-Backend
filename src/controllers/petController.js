const mongoose = require('mongoose');
const PetModel = require('../models/PetModel');
const { uploadToCloudinary, getOptimizedUrl, downloadFromCloudinary, getDownloadUrl, deleteFromCloudinary } = require('../utils/cloudinary');

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
                color,
                gender,
                species,
                breed,
                birthDate: new Date(birthDate),
                description
            };
    
            // Crear la mascota sin imagen
            const pet = new PetModel(petData);
            await pet.save();
    
            // Si hay una foto, procesarla después de guardar
            if (req.file) {
                try {
                    const result = await uploadToCloudinary(req.file.path);
                    pet.profile_picture = result.secure_url;
                    await pet.save();
                } catch (uploadError) {
                    console.error('Error al subir la imagen:', uploadError);
                    return res.status(500).json({
                        ok: false,
                        message: 'Mascota creada, pero hubo un error al subir la imagen'
                    });
                }
            }
    
            // Obtener la mascota con la edad calculada y limpiar datos innecesarios
            const petWithAge = await PetModel.findById(pet._id)
                .select('-__v -createdAt -updatedAt');
    
            // Crear objeto de respuesta limpio
            const responseData = {
                ...petWithAge.toJSON(),
                age: petWithAge.calculatedAge
            };
    
            // Eliminar campos innecesarios
            delete responseData.id;
    
            res.status(201).json({
                ok: true,
                message: 'Mascota creada exitosamente',
                pet: responseData
            });
    
        } catch (error) {
            console.error('Error al crear la mascota:', error);
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
            const { birthDate } = req.body;

            // Si se proporciona una fecha, validarla
            if (birthDate) {
                const isValidDate = !isNaN(new Date(birthDate).getTime());
                if (!isValidDate) {
                    return res.status(400).json({
                        ok: false,
                        message: 'Formato de fecha inválido'
                    });
                }
                req.body.birthDate = new Date(birthDate);
            }

            // Verificar si la mascota existe y pertenece al usuario
            const pet = await PetModel.findOne({ _id: petId, owner: userId });
            if (!pet) {
                return res.status(404).json({
                    ok: false,
                    message: 'Mascota no encontrada o no autorizado'
                });
            }

            // Actualizar datos
            Object.assign(pet, req.body);

            // Si hay nuevas fotos, procesarlas
            if (req.files?.length > 0) {
                const uploadResults = await Promise.all(
                    req.files.map(file => uploadToCloudinary(file.path))
                );
                pet.photos = [...(pet.photos || []), ...uploadResults.map(r => r.secure_url)];
            }

            await pet.save();

            // Obtener la mascota actualizada con la edad calculada
            const updatedPet = await PetModel.findById(pet._id);

            res.status(200).json({
                ok: true,
                message: 'Mascota actualizada exitosamente',
                pet: {
                    ...updatedPet.toObject(),
                    age: updatedPet.calculatedAge
                }
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
    },

    updatePetProfilePicture: async (req, res) => {
        try {
            const petId = req.params.id;
            const userId = req.user.id;

            const pet = await PetModel.findOne({ 
                _id: petId, 
                owner: userId 
            });

            if (!pet) {
                return res.status(404).json({
                    ok: false,
                    message: 'Mascota no encontrada o no autorizado'
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    ok: false,
                    message: 'No se ha proporcionado ninguna imagen'
                });
            }

            try {
                const oldProfilePicture = pet.profile_picture;
                const result = await uploadToCloudinary(req.file.path);

                await PetModel.findByIdAndUpdate(
                    petId,
                    { profile_picture: result.secure_url },
                    { new: true }
                );

                if (oldProfilePicture) {
                    try {
                        await deleteFromCloudinary(oldProfilePicture);
                    } catch (deleteError) {
                        console.error('Error al eliminar foto anterior:', deleteError);
                    }
                }

                res.status(200).json({
                    ok: true,
                    message: 'Foto de perfil actualizada exitosamente',
                    profile_picture: result.secure_url
                });
            } catch (cloudinaryError) {
                console.error('Error al subir imagen:', cloudinaryError);
                return res.status(500).json({
                    ok: false,
                    message: 'Error al subir la imagen',
                    error: cloudinaryError.message
                });
            }

        } catch (error) {
            console.error('Error en actualización de foto:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al actualizar la foto de perfil',
                error: error.message
            });
        }
    },

    getProfilePicture: async (req, res) => {
        try {
            const petId = req.params.id;
            const pet = await PetModel.findById(petId).select('profile_picture');

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
                message: 'Error al obtener la foto de perfil'
            });
        }
    },

    removeProfilePicture: async (req, res) => {
        try {
            const petId = req.params.id;
            const userId = req.user.id;

            const pet = await PetModel.findOne({ _id: petId, owner: userId });
            if (!pet) {
                return res.status(404).json({
                    ok: false,
                    message: 'Mascota no encontrada o no autorizado'
                });
            }

            if (!pet.profile_picture) {
                return res.status(400).json({
                    ok: false,
                    message: 'La mascota no tiene foto de perfil'
                });
            }

            // Guardar la URL anterior
            const oldProfilePicture = pet.profile_picture;

            // Eliminar la foto de perfil del modelo
            pet.profile_picture = null;
            await pet.save();

            // Eliminar la imagen de Cloudinary
            try {
                await deleteFromCloudinary(oldProfilePicture);
                console.log('Foto eliminada de Cloudinary');
            } catch (deleteError) {
                console.error('Error al eliminar foto de Cloudinary:', deleteError);
               
            }

            res.status(200).json({
                ok: true,
                message: 'Foto de perfil eliminada exitosamente'
            });

        } catch (error) {
            console.error('Error al eliminar foto de perfil:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al eliminar la foto de perfil'
            });
        }
    },

    downloadProfilePicture: async (req, res) => {
        try {
            const petId = req.params.id;
            
            const pet = await PetModel.findById(petId);
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

            // Obtener URL de descarga optimizada
            const downloadUrl = getDownloadUrl(pet.profile_picture);

            res.status(200).json({
                ok: true,
                downloadUrl
            });

        } catch (error) {
            console.error('Error al descargar foto de perfil:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al descargar la foto de perfil'
            });
        }
    },

    downloadAllPhotos: async (req, res) => {
        try {
            const petId = req.params.id;
            
            const pet = await PetModel.findById(petId);
            if (!pet) {
                return res.status(404).json({
                    ok: false,
                    message: 'Mascota no encontrada'
                });
            }

            const photos = [...(pet.photos || [])];
            if (pet.profile_picture) {
                photos.unshift(pet.profile_picture);
            }

            if (photos.length === 0) {
                return res.status(404).json({
                    ok: false,
                    message: 'La mascota no tiene fotos'
                });
            }

            // Obtener URLs de descarga para todas las fotos
            const downloadUrls = photos.map(photo => getDownloadUrl(photo));

            res.status(200).json({
                ok: true,
                downloadUrls
            });

        } catch (error) {
            console.error('Error al descargar fotos:', error);
            res.status(500).json({
                ok: false,
                message: 'Error al descargar las fotos'
            });
        }
    }
};

module.exports = PetController;
