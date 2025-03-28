const PetModel = require('../models/PetModel');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const UserModel = require('../models/UserModel');

const PetData = {
    /**
     * Obtiene todas las mascotas con paginación y filtros
     */
    getAllPets: async (filters = {}, page = 1, limit = 10) => {
        try {
            const query = {};
            
            // Aplicar filtros si existen
            if (filters.species) query.species = filters.species;
            if (filters.gender) query.gender = filters.gender;
            if (filters.status) query.estatus = filters.status;
            if (filters.city) query['location.city'] = { $regex: filters.city, $options: 'i' };
            
            const options = {
                page: parseInt(page),
                limit: parseInt(limit),
                sort: { created_at: -1 },
                populate: { path: 'owner', select: 'name profile_picture' }
            };
            
            const pets = await PetModel.find(query)
                .skip((page - 1) * limit)
                .limit(limit)
                .sort({ created_at: -1 })
                .populate('owner', 'name profile_picture');
                
            const total = await PetModel.countDocuments(query);
            
            return {
                pets,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                total
            };
        } catch (error) {
            throw error;
        }
    },
    
    /**
     * Obtiene una mascota por su ID
     */
    getPetById: async (petId) => {
        try {
            const pet = await PetModel.findById(petId)
                .populate('owner', 'name email profile_picture phone city state country address is_profile_public show_contact');
            return pet;
        } catch (error) {
            throw error;
        }
    },
    
    /**
     * Obtiene las mascotas de un propietario específico
     */
    getPetsByOwner: async (ownerId) => {
        try {
            const pets = await PetModel.find({ owner: ownerId })
                .sort({ created_at: -1 });
            return pets;
        } catch (error) {
            throw error;
        }
    },
    
    /**
     * Crea una nueva mascota
     */
    createPet: async (petData, photoBuffer = null, mimeType = null) => {
        try {
            // Validar datos básicos
            if (!petData.name) {
                throw new Error('El nombre es obligatorio');
            }
    
            // Validar formato de fecha
            if (petData.birthDate && isNaN(new Date(petData.birthDate).getTime())) {
                throw new Error('Formato de fecha inválido');
            }
    
            // Definir valores por defecto
            const newPet = new PetModel({
                owner: petData.owner,
                name: petData.name,
                gender: petData.gender || 'No especificado',
                species: petData.species || 'No especificado',
                breed: petData.breed || 'No especificado',
                color: petData.color || 'No especificado',
                birthDate: petData.birthDate ? new Date(petData.birthDate) : null,
                description: petData.description || '',
            });
    
            await newPet.save();
    
            // Subir imagen si existe
            if (photoBuffer) {
                const result = await uploadToCloudinary(photoBuffer, mimeType);
                newPet.profile_picture = result.secure_url;
                await newPet.save();
            }
    
            return newPet;
        } catch (error) {
            throw error;
        }
    },
    
    /**
     * Actualiza una mascota existente
     */
    updatePet: async (petId, updateData, photos = []) => {
        try {
            // Primero verificar que la mascota existe
            const pet = await PetModel.findById(petId);
            if (!pet) {
                throw new Error('Mascota no encontrada');
            }
            
            // Actualizar los campos de la mascota
            Object.keys(updateData).forEach(key => {
                if (updateData[key] !== undefined) {
                    pet[key] = updateData[key];
                }
            });
            
            // Si hay nuevas fotos, procesarlas
            if (photos && photos.length > 0) {
                const uploadPromises = photos.map(photo => 
                    uploadToCloudinary(photo.buffer, photo.mimetype)
                );
                const results = await Promise.all(uploadPromises);
                
                // Añadir las nuevas URLs a las fotos existentes
                const newPhotoUrls = results.map(result => result.secure_url);
                pet.photos = [...(pet.photos || []), ...newPhotoUrls];
            }
            
            await pet.save();
            return pet;
        } catch (error) {
            throw error;
        }
    },
    
    /**
     * Elimina una mascota
     */
    deletePet: async (petId) => {
        try {
            const pet = await PetModel.findById(petId);
            if (!pet) {
                throw new Error('Mascota no encontrada');
            }
            
            // Eliminar fotos de Cloudinary
            if (pet.profile_picture) {
                await deleteFromCloudinary(pet.profile_picture);
            }
            
            if (pet.photos && pet.photos.length > 0) {
                const deletePromises = pet.photos.map(photo => deleteFromCloudinary(photo));
                await Promise.all(deletePromises);
            }
            
            await PetModel.findByIdAndDelete(petId);
            return true;
        } catch (error) {
            throw error;
        }
    },
    
    /**
     * Actualiza la foto de perfil de una mascota
     */
    updatePetProfilePicture: async (petId, photoBuffer, mimeType) => {
        try {
            const pet = await PetModel.findById(petId);
            if (!pet) {
                throw new Error('Mascota no encontrada');
            }
            
            // Eliminar foto anterior si existe
            if (pet.profile_picture) {
                await deleteFromCloudinary(pet.profile_picture);
            }
            
            // Subir nueva foto
            const result = await uploadToCloudinary(photoBuffer, mimeType);
            pet.profile_picture = result.secure_url;
            await pet.save();
            
            return result.secure_url;
        } catch (error) {
            throw error;
        }
    },
    
    /**
     * Elimina la foto de perfil de una mascota
     */
    removeProfilePicture: async (petId) => {
        try {
            const pet = await PetModel.findById(petId);
            if (!pet) {
                throw new Error('Mascota no encontrada');
            }
            
            if (pet.profile_picture) {
                await deleteFromCloudinary(pet.profile_picture);
                pet.profile_picture = null;
                await pet.save();
            }
            
            return true;
        } catch (error) {
            throw error;
        }
    },
    
    /**
     * Añade fotos a una mascota
     */
    addPetPhotos: async (petId, photos) => {
        try {
            const pet = await PetModel.findById(petId);
            if (!pet) {
                throw new Error('Mascota no encontrada');
            }
            
            const uploadPromises = photos.map(photo => 
                uploadToCloudinary(photo.buffer, photo.mimetype)
            );
            const results = await Promise.all(uploadPromises);
            
            const newPhotoUrls = results.map(result => result.secure_url);
            pet.photos = [...(pet.photos || []), ...newPhotoUrls];
            await pet.save();
            
            return newPhotoUrls;
        } catch (error) {
            throw error;
        }
    },
    
    /**
     * Elimina una foto específica de una mascota
     */
    deletePetPhoto: async (petId, photoUrl) => {
        try {
            const pet = await PetModel.findById(petId);
            if (!pet) {
                throw new Error('Mascota no encontrada');
            }
            
            if (!pet.photos.includes(photoUrl)) {
                throw new Error('Foto no encontrada');
            }
            
            await deleteFromCloudinary(photoUrl);
            pet.photos = pet.photos.filter(photo => photo !== photoUrl);
            await pet.save();
            
            return true;
        } catch (error) {
            throw error;
        }
    },
    
   
    
    /**
     * Actualiza la ubicación de una mascota
     */
    updatePetLocation: async (petId, locationData) => {
        try {
            const pet = await PetModel.findByIdAndUpdate(
                petId,
                { location: locationData },
                { new: true }
            );
            
            if (!pet) {
                throw new Error('Mascota no encontrada');
            }
            
            return pet;
        } catch (error) {
            throw error;
        }
    },
    
    /**
     * Obtener el perfil público de una mascota
     * @param {string} petId - ID de la mascota
     */
    getPublicProfile: async (petId) => {
        const pet = await PetModel.findById(petId)
            .populate('owner', 'name email profilePicture')
            .select('name species breed age color weight description isLost lastSeenLocation photos medicalInfo');
        
        if (!pet) {
            throw new Error('Mascota no encontrada');
        }
        
        // Formatear los datos para el perfil público
        return {
            _id: pet._id,
            name: pet.name,
            species: pet.species,
            breed: pet.breed,
            age: pet.age,
            color: pet.color,
            weight: pet.weight,
            description: pet.description,
            lastSeenLocation: pet.lastSeenLocation,
            photos: pet.photos,
            profile_picture: pet.profile_picture,
            medicalInfo: pet.medicalInfo,
            owner: {
                _id: pet.owner._id,
                name: pet.owner.name,
                profile_picture: pet.owner.profile_picture
            }
        };
    },
};

module.exports = PetData;
