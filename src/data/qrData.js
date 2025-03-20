const QRModel = require('../models/QRModel');
const PetModel = require('../models/PetModel');
const crypto = require('crypto');
const QRCode = require('qrcode');
const QRScanModel = require('../models/QRScanModel');

const qrData = {
    /**
     * Generar un código QR
     * @param {string} userId - ID del usuario
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
     * @param {string} scannerUserId - ID del usuario que escanea el QR
     */
    scanQR: async (qrId, scannerUserId = null) => {
        // Buscar el QR (ahora solo verificamos que exista, ya no comprobamos isActive)
        const qr = await QRModel.findOne({ qrId });
        
        if (!qr || !qr.isActive) {
            throw new Error('QR no encontrado o ha sido eliminado');
        }
        
        // Registrar el escaneo
        await QRScanModel.create({
            qrId: qr._id,
            scannedBy: scannerUserId,
            scanDate: new Date(),
            location: null // Se podría añadir la ubicación si se proporciona
        });
        
        // Verificar si el QR está vinculado a una mascota
        if (qr.isLinked && qr.petId) {
            const petData = require('./petData');
            const petProfile = await petData.getPublicProfile(qr.petId);
            return {
                message: 'Hola Estoy perdido, me puedes ayudar a encontrar a mi dueño?',
                pet: petProfile
            };
        } else {
            return {
                qrId: qr.qrId,
                isLinked: false,
                message: 'Este QR no está vinculado a ninguna mascota. Por favor, redirige a vincular una mascota.'  
            };
        }
    },
    
    /**
     * Vincular un QR a una mascota
     * @param {string} qrId - ID del QR
     * @param {string} petId - ID de la mascota
     * @param {string} userId - ID del usuario
     * @param {string} userRole - Rol del usuario
     */
    linkQRToPet: async (qrId, petId, userId, userRole) => {
        // Verificar si el QR existe
        const qr = await QRModel.findOne({ qrId });
        
        if (!qr || !qr.isActive) {
            throw new Error('QR no encontrado o ha sido eliminado');
        }
        
        // Verificar si el QR ya está vinculado
        if (qr.isLinked) {
            const petData = require('./petData');
            const petProfile = await petData.getPublicProfile(qr.petId);
            return {    
                isLinked: true,
                message: 'Hola me encontré a esta mascota',
                pet: petProfile
            };
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
     * Obtener todos los QR
     */
    getAllQRs: async () => {
        const qrs = await QRModel.find().populate('petId', 'name species breed');
        return qrs;
    },
    
    /**
     * Obtener QRs de un usuario
     * @param {string} userId - ID del usuario
     */
    getUserQRs: async (userId) => {
        const qrs = await QRModel.find({ userId }).populate('petId', 'name species breed');
        return qrs;
    },
    
    /**
     * Desactivar un QR (ahora solo para administradores)
     * @param {string} qrId - ID del QR
     * @param {string} userId - ID del usuario
     * @param {string} userRole - Rol del usuario
    */
    deactivateQR: async (qrId, userId, userRole) => {
        // Verificar si el QR existe
        const qr = await QRModel.findOne({ qrId });
        
        if (!qr) {
            throw new Error('QR no encontrado');
        }
        
        // Verificar si el usuario es administrador
        if (userRole !== 'admin') {
            throw new Error('Solo los administradores pueden desactivar códigos QR');
        }
        
        // Actualizar el QR
        const updatedQR = await QRModel.findOneAndUpdate(
            { qrId },
            { isActive: false },
            { new: true }
        );
        
        return updatedQR;
    },
    
    /**
     * Eliminar un QR (para usuarios normales)
     * @param {string} qrId - ID del QR
     * @param {string} userId - ID del usuario
     */
    deleteQR: async (qrId, userId) => {
        // Verificar si el QR existe
        const qr = await QRModel.findOne({ qrId });
        
        if (!qr) {
            throw new Error('QR no encontrado');
        }
        
        // Verificar si el usuario es dueño del QR
        if (qr.userId.toString() !== userId) {
            throw new Error('No tienes permiso para eliminar este QR');
        }
        
      
        
        // Eliminar el QR
        await QRModel.findOneAndDelete({ qrId });
        
        return { message: 'QR eliminado exitosamente' };
    }
};

module.exports = qrData; 