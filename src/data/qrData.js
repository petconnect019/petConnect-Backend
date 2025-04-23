const QRModel = require('../models/QRModel');
const PetModel = require('../models/PetModel');
const crypto = require('crypto');
const QRCode = require('qrcode');
const QRScanModel = require('../models/QRScanModel');
const OrderModel = require('../models/OrderModel');

// Función para generar imagen QR (implementada directamente aquí)
const generateQRImage = async (data) => {
    try {
        // Opciones mejoradas para generar QRs más robustos
        const options = {
            errorCorrectionLevel: 'H', // Alta corrección de errores
            margin: 2, // Margen alrededor del QR
            width: 300, // Tamaño del QR
            color: {
                dark: '#000000', // Color del QR
                light: '#FFFFFF' // Color de fondo
            }
        };
        
        // Obtener la URL base adecuada
        const baseUrl = process.env.FRONTEND_URL;
        
        // Agregamos el dominio del frontend a la URL para asegurar que funcione correctamente
        const qrContent = typeof data === 'string' ? `${baseUrl}/qr/scan/${data}` : JSON.stringify(data);
        
        const qrImage = await QRCode.toDataURL(qrContent, options);
        return qrImage;
    } catch (error) {
        console.error('Error al generar código QR:', error);
        throw error;
    }
};

const qrData = {
    /**
     * Generar múltiples códigos QR
     * @param {string} userId - ID del usuario
     * @param {number} count - Cantidad de QRs a generar
     * @param {string} orderId - ID de la orden asociada
     */
    generateMultipleQRs: async (userId, count, orderId) => {
        const qrCodes = [];
        
        for (let i = 0; i < count; i++) {
            // Generar un ID único para generar la imagen del QR
            const uniqueId = crypto.randomBytes(8).toString('hex');
            
            // Generar la imagen del QR usando la función mejorada
            const qrImage = await generateQRImage(uniqueId);
            
            // Crear el registro en la base de datos
            const qr = await QRModel.create({
                userId,
                isLinked: false,
                isActive: true,
                qrImage,
                orderId: orderId
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
    scanQR: async (qrId, scannerUserId = null, locationData = null) => {
        // Buscar el QR por su ID de MongoDB
        const qr = await QRModel.findById(qrId);
        
        if (!qr || !qr.isActive) {
            throw new Error('QR no encontrado o ha sido eliminado');
        }
        
        // Registrar el escaneo
        const scanRecord = await QRScanModel.create({
            qrId: qr._id,
            scannedBy: scannerUserId,
            scanDate: new Date(),
            location: locationData ? {
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                address: locationData.address
            } : null
        });
        
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
                scanId: scanRecord._id,
                requiresLocation: !locationData
            };
        } else {
            return {
                qrId: qr._id.toString(),
                isLinked: false,
                message: 'Este QR no está vinculado a ninguna mascota. Por favor, redirige a vincular una mascota.'  
            };
        }
    },
    
    /**
     * Vincular un QR a una mascota
     * @param {string} qrId - ID del QR (ID de MongoDB)
     * @param {string} petId - ID de la mascota
     * @param {string} userId - ID del usuario
     * @param {string} userRole - Rol del usuario
     */
    linkQRToPet: async (qrId, petId, userId, userRole) => {
        // Verificar si el QR existe
        const qr = await QRModel.findById(qrId);
        
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
        const updatedQR = await QRModel.findByIdAndUpdate(
            qrId,
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

            // Obtener el historial de escaneos
            const history = await QRScanModel.find({ qrId })
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