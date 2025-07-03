const QRModel = require('../models/QRModel');
const PetModel = require('../models/PetModel');
const crypto = require('crypto');
const QRCode = require('qrcode');
const QRScanModel = require('../models/QRScanModel');
const OrderModel = require('../models/OrderModel');
const mongoose = require('mongoose');



const qrData = {
    /**
     * @param {string} userId - ID del usuario
     * @param {number} count - Cantidad de QRs a generar
     */
    generateMultipleQRs: async (userId, count) => {
        const qrCodes = [];
        
        for (let i = 0; i < count; i++) {
            try {
                // Generar un ID único para el QR (24 caracteres hexadecimales)
                const _id = crypto.randomBytes(12).toString('hex');
                console.log('ID generado:', _id);
                
                // Crear el registro en la base de datos
                const qrRecord = new QRModel({ 
                    userId,
                    isLinked: false,
                    isActive: true,
                    _id 
                });
                await qrRecord.save();
                console.log('QR guardado en DB con ID:', qrRecord._id);
                
             
                const qrURL = `${process.env.FRONTEND_URL}/qr-landing/${qrRecord._id}`;
                console.log('URL generada:', qrURL);
                
                // Generar el código QR como una imagen en base64
                const qrImage = await QRCode.toDataURL(qrURL);
                
                qrRecord.qrImage = qrImage;
                await qrRecord.save();
                
                qrCodes.push({
                    _id: qrRecord._id,
                    qrImage,
                    qrURL,
                    isLinked: false,
                    isActive: true,
                    userId
                });
            } catch (error) {
                console.error('Error al generar código QR:', error);
                throw error;
            }
        }
        
        return qrCodes;
    },
    
 
    
    /**
     * Obtener información de un QR escaneado
     * @param {string} _id - ID del QR
     * @param {string} scannerUserId - ID del usuario que escanea el QR
     */
    scanQR: async (_id, scannerUserId = null, locationData = null) => {
        // Verificar si el qrId parece un ObjectId (24 caracteres hex) o no
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(_id);
        
        let qr;
        if (isValidObjectId) {
            // Buscar el QR por su ID de MongoDB
            qr = await QRModel.findById(_id);
        } else {
            // Buscar por qrId en lugar de qrCode (que no existe en el modelo)
            qr = await QRModel.findOne({ _id: _id });
        }
        
        if (!qr || !qr.isActive) {
            throw new Error('QR no encontrado o ha sido eliminado');
        }
        console.log('QR encontrado:', qr);
        
        try {
            // Verificar si el QR está vinculado a una mascota
            if (qr.isLinked && qr.petId) {
                const petData = require('./petData');
                const petProfile = await petData.getPublicProfile(qr.petId);
                
                // Si se proporcionó ubicación, actualizar la ubicación de la mascota
                if (locationData) {
                    await petData.updatePetLocation(qr.petId, locationData);
                }
                
                return {
                    message: 'Hola Estoy perdido, me puedes ayudar a encontrar a mi dueño?',
                    pet: petProfile,
                    requiresLocation: !locationData,
                    isLinked: true
                };
            } else {
                return {
                    _id: qr._id.toString(),
                    isLinked: false,
                    message: 'Este QR no está vinculado a ninguna mascota. Por favor, redirige a vincular una mascota.'
                };
            }
        } catch (error) {
            console.error('Error al registrar escaneo de QR:', error);
            throw error;
        }
    },
    
    /**
     * Vincular un QR a una mascota
     * @param {string} _id - ID del QR (puede ser el _id de MongoDB o el qrId)
     * @param {string} petId - ID de la mascota
     * @param {string} userId - ID del usuario
     * @param {string} userRole - Rol del usuario
     */
        linkQRToPet: async (_id, petId, userId, userRole) => {
        try {
            console.log('Intentando vincular QR. ID recibido:', _id);          
            // Asegurarnos de que el ID tenga el formato correcto
            if (!_id || _id.length !== 24) {
                throw new Error('ID de QR inválido - debe tener 24 caracteres');
            }
            
            // Primero intentar encontrar el QR por qrId exacto
            let qr = await QRModel.findOne({ _id: _id });
            console.log('Búsqueda por qrId exacto:', qr);
            
            if (!qr) {
                // Si no se encuentra, intentar con el ID en minúsculas
                qr = await QRModel.findOne({ _id: _id.toLowerCase() });
                console.log('Búsqueda por qrId en minúsculas:', qr);
            }
            
            // Si no se encuentra, intentar buscar por _id de MongoDB
            if (!qr && mongoose.Types.ObjectId.isValid(_id)) {
                qr = await QRModel.findById(_id);
            }
            
            // Verificar que el QR existe y está activo
            if (!qr || !qr.isActive) {
                throw new Error('QR no encontrado o ha sido eliminado');
            }
            
            // Solo registrar el escaneo si el QR está vinculado y no es escaneado por su dueño
            if (qr.isLinked && qr.petId && qr.userId.toString() !== userId) {
                const scanRecord = await QRScanModel.create({
                    qrId: qr._id,
                    scannedBy: userId,
                    scanDate: new Date(),
                    location: null // No se dispone de datos de ubicación en este contexto
                });
                console.log('Registro de escaneo en linkQRToPet:', scanRecord);
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
            if (pet.owner.toString() !== userId) {
                throw new Error('No tienes permiso para vincular este QR a esta mascota');
            }
            
            // Actualizar el QR
            const updatedQR = await QRModel.findByIdAndUpdate(
                qr._id,
                { petId, isLinked: true },
                { new: true }
            );
            
            return updatedQR;
        } catch (error) {
            console.error('Error al vincular QR:', error);
            throw error;
        }
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
     * @param {string} qrId - ID del QR (ID de MongoDB)
     * @param {string} userId - ID del usuario
     * @param {string} userRole - Rol del usuario
    */
    deactivateQR: async (qrId, userId, userRole) => {
        // Verificar si el QR existe
        const qr = await QRModel.findById(qrId);
        
        if (!qr) {
            throw new Error('QR no encontrado');
        }
        
        // Verificar si el usuario es administrador
        if (userRole !== 'admin') {
            throw new Error('Solo los administradores pueden desactivar códigos QR');
        }
        
        // Actualizar el QR
        const updatedQR = await QRModel.findByIdAndUpdate(
            qrId,
            { isActive: false },
            { new: true }
        );
        
        return updatedQR;
    },
    
    /**
     * Eliminar un QR (para usuarios normales)
     * @param {string} qrId - ID del QR (ID de MongoDB)
     * @param {string} userId - ID del usuario
     */
    deleteQR: async (qrId, userId) => {
        // Verificar si el QR existe
        const qr = await QRModel.findById(qrId);
        
        if (!qr) {
            throw new Error('QR no encontrado');
        }
        
        // Verificar si el usuario es dueño del QR
        if (qr.userId.toString() !== userId) {
            throw new Error('No tienes permiso para eliminar este QR');
        }
        
        // Eliminar el QR
        await QRModel.findByIdAndDelete(qrId);
        
        return { message: 'QR eliminado exitosamente' };
    },
    
    /**
     * Obtiene un QR específico por su ID
     * @param {string} qrId - ID del QR a obtener (ID de MongoDB)
     * @returns {Object} Datos del QR
     */
    getQRById: async (qrId) => {
        try {
            const qr = await QRModel.findById(qrId);
            
            if (!qr) {
                throw new Error('Código QR no encontrado');
            }
            
            return {
                id: qr._id,
                orderId: qr.orderId,
                isActive: qr.isActive,
                isLinked: qr.isLinked,
                petId: qr.petId,
                createdAt: qr.createdAt,
                qrImage: qr.qrImage
            };
        } catch (error) {
            console.error(`Error al obtener QR por ID ${qrId}:`, error);
            throw error;
        }
    },
    
    /**
     * Obtiene todos los QRs asociados a las órdenes pagadas de un usuario
     * @param {string} userId - ID del usuario
     * @returns {Array} Array de QRs asociados al usuario
     */
    getUserQRCodes: async (userId) => {
        try {
            // Buscar órdenes pagadas del usuario
            const orders = await OrderModel.find({ 
                userId,
                status: 'completed',
                paymentStatus: 'COMPLETED'
            }).populate('qrCodes', 'qrImage isLinked isActive userId petId');
            
            if (!orders || orders.length === 0) {
                return [];
            }
            
            // Extraer QRs activos de las órdenes
            const qrCodes = orders.reduce((acc, order) => {
                if (order.qrCodes && Array.isArray(order.qrCodes)) {
                    const orderQRs = order.qrCodes.filter(qr => qr && qr.isActive);
                    return acc.concat(orderQRs);
                }
                return acc;
            }, []);
            
            return qrCodes;
        } catch (error) {
            console.error(`Error al obtener QRs del usuario ${userId}:`, error);
            throw error;
        }
    },

    /**
     * Obtiene el historial de escaneos de un QR
     * @param {string} qrId - ID del QR
     * @param {string} userId - ID del usuario que solicita el historial
     * @returns {Array} Historial de escaneos del QR
     */
    getQRHistory: async (qrId, userId) => {
        try {
            // Verificar que el QR existe y pertenece al usuario
            const qr = await QRModel.findById(qrId);
            if (!qr) {
                throw new Error('QR no encontrado');
            }

            if (qr.userId.toString() !== userId) {
                throw new Error('No tienes permiso para ver el historial de este QR');
            }

            console.log('Buscando historial para qrId:', qr._id);

            // Obtener el historial de escaneos usando el ObjectId del QR
            const history = await QRScanModel.find({ qrId: qr._id })
                .sort({ scanDate: -1 })
                .populate('scannedBy', 'name email');

            return history;
        } catch (error) {
            console.error(`Error al obtener historial del QR ${qrId}:`, error);
            throw error;
        }
    }
};

module.exports = qrData; 