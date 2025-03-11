const QRModel = require('../models/QRModel');
const PetModel = require('../models/PetModel');
const crypto = require('crypto');
const QRCode = require('qrcode');

const qrController = {
    /**
     * Genera un nuevo código QR
     */
    generateQR: async (req, res) => {
        try {
            const qrId = crypto.randomBytes(8).toString('hex');
            const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
            const qrUrl = `${baseUrl}/api/qr/scan/${qrId}`;
            const qrImage = await QRCode.toDataURL(qrUrl);
            
            const qr = await QRModel.create({
                qrId,
                userId: req.user.id,
                isLinked: false,
                isActive: true,
                qrImage
            });
            
            res.status(201).json({
                success: true,
                qr
            });
        } catch (error) {
            console.error('Error al generar QR:', error);
            res.status(500).json({
                success: false,
                message: 'Error al generar el QR',
                error: error.message
            });
        }
    },
    
    /**
     * Genera múltiples códigos QR
     */
    generateMultipleQRs: async (req, res) => {
        try {
            const { count } = req.body;
            
            if (!count || count < 1 || count > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'La cantidad debe estar entre 1 y 100'
                });
            }
            
            const qrCodes = [];
            for (let i = 0; i < count; i++) {
                const qrId = crypto.randomBytes(8).toString('hex');
                const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
                const qrUrl = `${baseUrl}/api/qr/scan/${qrId}`;
                const qrImage = await QRCode.toDataURL(qrUrl);
                
                const qr = await QRModel.create({
                    qrId,
                    userId: req.user.id,
                    isLinked: false,
                    isActive: true,
                    qrImage
                });
                
                qrCodes.push(qr);
            }
            
            res.status(201).json({
                success: true,
                message: `${count} códigos QR generados`,
                qrCodes
            });
        } catch (error) {
            console.error('Error al generar QRs:', error);
            res.status(500).json({
                success: false,
                message: 'Error al generar los QRs',
                error: error.message
            });
        }
    },
    
    /**
     * Escanea un código QR (versión actualizada)
     */
    scanQR: async (req, res) => {
        try {
            const { qrId } = req.params;
            
            // Buscar el QR
            const qr = await QRModel.findOne({ qrId, isActive: true });
            
            if (!qr) {
                return res.status(404).json({
                    success: false,
                    message: 'QR no encontrado o inactivo'
                });
            }
            
            // Verificar si el QR está vinculado a una mascota
            if (!qr.isLinked || !qr.petId) {
                return res.json({
                    success: true,
                    qr: {
                        qrId: qr.qrId,
                        isLinked: false,
                        message: 'Este QR no está vinculado a ninguna mascota'
                    }
                });
            }
            
            // Obtener información de la mascota
            const pet = await PetModel.findById(qr.petId).populate('owner', 'name email');
            
            if (!pet) {
                return res.status(404).json({
                    success: false,
                    message: 'Mascota no encontrada'
                });
            }
            
            // Devolver información pública de la mascota
            res.json({
                success: true,
                qr: {
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
                }
            });
        } catch (error) {
            console.error('Error al escanear QR:', error);
            res.status(500).json({
                success: false,
                message: 'Error al escanear el QR',
                error: error.message
            });
        }
    },
    
    /**
     * Vincula un código QR a una mascota (versión actualizada)
     */
    linkQRToPet: async (req, res) => {
        try {
            const { qrId, petId } = req.body;
            
            // Verificar si el QR existe
            const qr = await QRModel.findOne({ qrId, isActive: true });
            
            if (!qr) {
                return res.status(404).json({
                    success: false,
                    message: 'QR no encontrado o inactivo'
                });
            }
            
            // Verificar si el QR ya está vinculado
            if (qr.isLinked) {
                return res.status(400).json({
                    success: false,
                    message: 'Este QR ya está vinculado a una mascota'
                });
            }
            
            // Verificar si la mascota existe
            const pet = await PetModel.findById(petId);
            
            if (!pet) {
                return res.status(404).json({
                    success: false,
                    message: 'Mascota no encontrada'
                });
            }
            
            // Verificar si el usuario es dueño de la mascota
            if (pet.owner.toString() !== req.user.id && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para vincular este QR a esta mascota'
                });
            }
            
            // Actualizar el QR
            const updatedQR = await QRModel.findOneAndUpdate(
                { qrId },
                { petId, isLinked: true },
                { new: true }
            );
            
            res.json({
                success: true,
                qr: updatedQR
            });
        } catch (error) {
            console.error('Error al vincular QR:', error);
            res.status(500).json({
                success: false,
                message: 'Error al vincular el QR',
                error: error.message
            });
        }
    },
    
    /**
     * Obtiene todos los códigos QR
     */
    getAllQRs: async (req, res) => {
        try {
            const qrs = await QRModel.find().populate('petId', 'name species breed');
            
            res.json({
                success: true,
                qrs
            });
        } catch (error) {
            console.error('Error al obtener QRs:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener los QRs',
                error: error.message
            });
        }
    },
    
    /**
     * Obtiene los códigos QR de un usuario
     */
    getUserQRs: async (req, res) => {
        try {
            const userId = req.user.id;
            const qrs = await QRModel.find({ userId }).populate('petId', 'name species breed');
            
            res.json({
                success: true,
                qrs
            });
        } catch (error) {
            console.error('Error al obtener QRs del usuario:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener los QRs del usuario',
                error: error.message
            });
        }
    },
    
    /**
     * Desactiva un código QR
     */
    deactivateQR: async (req, res) => {
        try {
            const { qrId } = req.params;
            
            // Verificar si el QR existe
            const qr = await QRModel.findOne({ qrId });
            
            if (!qr) {
                return res.status(404).json({
                    success: false,
                    message: 'QR no encontrado'
                });
            }
            
            // Verificar si el usuario tiene permiso para desactivar este QR
            if (qr.userId.toString() !== req.user.id && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para desactivar este QR'
                });
            }
            
            // Actualizar el QR
            const updatedQR = await QRModel.findOneAndUpdate(
                { qrId },
                { isActive: false },
                { new: true }
            );
            
            res.json({
                success: true,
                qr: updatedQR
            });
        } catch (error) {
            console.error('Error al desactivar QR:', error);
            res.status(500).json({
                success: false,
                message: 'Error al desactivar el QR',
                error: error.message
            });
        }
    }
};

module.exports = qrController; 