const QRModel = require('../models/QRModel');
const PetModel = require('../models/PetModel');
const crypto = require('crypto');
const QRCode = require('qrcode');

const qrData = {
    /**
     * Generar un código QR
     * @param {string} userId - ID del usuario
     * @returns {Promise<Object>} - El QR generado
     */
    generateQR: async (userId) => {
        const qrId = crypto.randomBytes(8).toString('hex');
        const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
        const qrUrl = `${baseUrl}/api/qr/scan/${qrId}`;
        const qrImage = await QRCode.toDataURL(qrUrl);
        
        const qr = await QRModel.create({
            qrId,
            userId,
            isLinked: false,
            isActive: true,
            qrImage
        });
        
        return qr;
    },
    
    /**
     * Generar múltiples códigos QR
     * @param {string} userId - ID del usuario
     * @param {number} count - Cantidad de QRs a generar
     * @returns {Promise<Array>} - Lista de QRs generados
     */
    generateMultipleQRs: async (userId, count) => {
        const qrCodes = [];
        
        for (let i = 0; i < count; i++) {
            const qrId = crypto.randomBytes(8).toString('hex');
            const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
            const qrUrl = `${baseUrl}/api/qr/scan/${qrId}`;
            const qrImage = await QRCode.toDataURL(qrUrl);
            
            const qr = await QRModel.create({
                qrId,
                userId,
                isLinked: false,
                isActive: true,
                qrImage
            });
            
            qrCodes.push(qr);
        }
        
        return qrCodes;
    },
    
    /**
     * Obtener información de un QR escaneado
     * @param {string} qrId - ID del QR
     * @returns {Promise<Object>} - Información del QR y la mascota vinculada (si existe)
     */
    scanQR: async (qrId) => {
        // Buscar el QR
        const qr = await QRModel.findOne({ qrId, isActive: true });
        
        if (!qr) {
            throw new Error('QR no encontrado o inactivo');
        }
        
        // Verificar si el QR está vinculado a una mascota
        if (!qr.isLinked || !qr.petId) {
            return {
                qrId: qr.qrId,
                isLinked: false,
                message: 'Este QR no está vinculado a ninguna mascota'
            };
        }
        
        // Obtener información de la mascota
        const pet = await PetModel.findById(qr.petId).populate('owner', 'name email');
        
        if (!pet) {
            throw new Error('Mascota no encontrada');
        }
        
        // Devolver información pública de la mascota
        return {
            qrId: qr.qrId,
            isLinked: true,
            isActive: qr.isActive,
            pet: {
                _id: pet._id,
                name: pet.name,
                species: pet.species,
                breed: pet.breed,
                age: pet.age,
                color: pet.color,
                description: pet.description,
                owner: {
                    _id: pet.owner._id,
                    name: pet.owner.name
                }
            }
        };
    },
    
    /**
     * Vincular un QR a una mascota
     * @param {string} qrId - ID del QR
     * @param {string} petId - ID de la mascota
     * @param {string} userId - ID del usuario
     * @param {string} userRole - Rol del usuario
     * @returns {Promise<Object>} - El QR actualizado
     */
    linkQRToPet: async (qrId, petId, userId, userRole) => {
        // Verificar si el QR existe
        const qr = await QRModel.findOne({ qrId, isActive: true });
        
        if (!qr) {
            throw new Error('QR no encontrado o inactivo');
        }
        
        // Verificar si el QR ya está vinculado
        if (qr.isLinked) {
            throw new Error('Este QR ya está vinculado a una mascota');
        }
        
        // Verificar si la mascota existe
        const pet = await PetModel.findById(petId);
        
        if (!pet) {
            throw new Error('Mascota no encontrada');
        }
        
        // Verificar si el usuario es dueño de la mascota
        if (pet.owner.toString() !== userId && userRole !== 'admin') {
            throw new Error('No tienes permiso para vincular este QR a esta mascota');
        }
        
        // Actualizar el QR
        const updatedQR = await QRModel.findOneAndUpdate(
            { qrId },
            { petId, isLinked: true },
            { new: true }
        );
        
        return updatedQR;
    },
    
    /**
     * Obtener todos los QRs
     * @returns {Promise<Array>} - Lista de todos los QRs
     */
    getAllQRs: async () => {
        const qrs = await QRModel.find().populate('petId', 'name species breed');
        return qrs;
    },
    
    /**
     * Obtener QRs de un usuario
     * @param {string} userId - ID del usuario
     * @returns {Promise<Array>} - Lista de QRs del usuario
     */
    getUserQRs: async (userId) => {
        const qrs = await QRModel.find({ userId }).populate('petId', 'name species breed');
        return qrs;
    },
    
    /**
     * Desactivar un QR
     * @param {string} qrId - ID del QR
     * @param {string} userId - ID del usuario
     * @param {string} userRole - Rol del usuario
     * @returns {Promise<Object>} - El QR actualizado
     */
    deactivateQR: async (qrId, userId, userRole) => {
        // Verificar si el QR existe
        const qr = await QRModel.findOne({ qrId });
        
        if (!qr) {
            throw new Error('QR no encontrado');
        }
        
        // Verificar si el usuario tiene permiso para desactivar este QR
        if (qr.userId.toString() !== userId && userRole !== 'admin') {
            throw new Error('No tienes permiso para desactivar este QR');
        }
        
        // Actualizar el QR
        const updatedQR = await QRModel.findOneAndUpdate(
            { qrId },
            { isActive: false },
            { new: true }
        );
        
        return updatedQR;
    }
};

module.exports = qrData; 