const QRModel = require('../models/QRModel');
const PetModel = require('../models/PetModel');
const QRCode = require('qrcode');
const crypto = require('crypto');

const QRData = {
    /**
     * Genera un nuevo código QR sin vincular a una mascota
     */
    generateQR: async () => {
        try {
            // Generar un ID único para el QR
            const qrId = crypto.randomBytes(16).toString('hex');
            
            // Crear el registro en la base de datos
            const qrRecord = new QRModel({ qrId });
            await qrRecord.save();
            
            // Generar la URL para el código QR
            const qrURL = `${process.env.FRONTEND_URL}/scan/${qrId}`;
            
            // Generar el código QR como una imagen en base64
            const qrImage = await QRCode.toDataURL(qrURL);
            
            return {
                qrId,
                qrImage,
                qrURL
            };
        } catch (error) {
            throw error;
        }
    },
    
    /**
     * Genera múltiples códigos QR
     */
    generateMultipleQRs: async (count) => {
        try {
            const qrCodes = [];
            
            for (let i = 0; i < count; i++) {
                const qrCode = await QRData.generateQR();
                qrCodes.push(qrCode);
            }
            
            return qrCodes;
        } catch (error) {
            throw error;
        }
    },
    
    /**
     * Verifica si un código QR está vinculado a una mascota
     */
    checkQRStatus: async (qrId) => {
        try {
            const qrRecord = await QRModel.findOne({ qrId }).populate('petId');
            
            if (!qrRecord) {
                throw new Error('Código QR no válido');
            }
            
            return {
                qrId: qrRecord.qrId,
                isLinked: !!qrRecord.petId,
                pet: qrRecord.petId
            };
        } catch (error) {
            throw error;
        }
    },
    
    /**
     * Vincula un código QR a una mascota
     */
    linkQRToPet: async (qrId, petId) => {
        try {
            // Verificar que el QR existe y no está vinculado
            const qrRecord = await QRModel.findOne({ qrId });
            
            if (!qrRecord) {
                throw new Error('Código QR no válido');
            }
            
            if (qrRecord.petId) {
                throw new Error('Este código QR ya está vinculado a una mascota');
            }
            
            // Verificar que la mascota existe
            const pet = await PetModel.findById(petId);
            
            if (!pet) {
                throw new Error('Mascota no encontrada');
            }
            
            // Vincular el QR a la mascota
            qrRecord.petId = petId;
            await qrRecord.save();
            
            return {
                qrId: qrRecord.qrId,
                petId: pet._id,
                petName: pet.name
            };
        } catch (error) {
            throw error;
        }
    },
    
    /**
     * Obtiene todos los códigos QR
     */
    getAllQRs: async () => {
        try {
            const qrRecords = await QRModel.find().populate('petId');
            return qrRecords;
        } catch (error) {
            throw error;
        }
    },
    
    /**
     * Desactiva un código QR
     */
    deactivateQR: async (qrId) => {
        try {
            const qrRecord = await QRModel.findOne({ qrId });
            
            if (!qrRecord) {
                throw new Error('Código QR no válido');
            }
            
            qrRecord.isActive = false;
            await qrRecord.save();
            
            return {
                qrId: qrRecord.qrId,
                isActive: false
            };
        } catch (error) {
            throw error;
        }
    }
};

module.exports = QRData; 