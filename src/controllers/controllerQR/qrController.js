const qrData = require('../../data/qrData');

/**
 * Determina el código de estado HTTP basado en el tipo de error
 * @param {Error} error - El error capturado
 * @returns {number} Código de estado HTTP
 */
const determineStatusCode = (error) => {
    if (error.message.includes('no encontrado') || error.message.includes('No encontrado')) {
        return 404;
    } else if (error.message.includes('permiso') || error.message.includes('autorizado')) {
        return 403;
    } else if (error.message.includes('requerido') || error.message.includes('inválido') || error.message.includes('ya existe')) {
        return 400;
    } else {
        return 500;
    }
};

const qrController = {
    /**
     * Genera múltiples códigos QR
     */
    generateMultipleQRs: async (req, res) => {
        try {
            const { userId, quantity, orderId } = req.body;
            
            // Validación de datos de entrada
            if (!quantity || quantity <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'La cantidad debe ser un número positivo'
                });
            }
            
            if (!orderId) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere un ID de orden válido'
                });
            }
            
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere un ID de usuario válido'
                });
            }
            
            // Delegación de la lógica de negocio a qrData
            const qrCodes = await qrData.generateMultipleQRs(userId, quantity, orderId);
            
            // Respuesta HTTP
            return res.status(201).json({
                success: true,
                message: `Se generaron ${quantity} códigos QR con éxito`,
                data: {
                    quantity,
                    orderId,
                    qrCodes
                }
            });
        } catch (error) {
            console.error('Error al generar códigos QR:', error);
            const statusCode = determineStatusCode(error);
            return res.status(statusCode).json({
                success: false,
                message: 'Error al generar códigos QR',
                error: error.message
            });
        }
    },
    
    /**
     * Escanea un código QR
     */
    scanQR: async (req, res) => {
        try {
            const { qrId } = req.params;
            const scannerUserId = req.user ? req.user.id : null;
            const locationData = req.body.location || null;
            
            // Delegación de la lógica de negocio a qrData
            const qrInfo = await qrData.scanQR(qrId, scannerUserId, locationData);
            
            // Si requiere ubicación y no se proporcionó, devolver un mensaje específico
            if (qrInfo.requiresLocation) {
                return res.status(200).json({
                    success: true,
                    qr: qrInfo,
                    message: 'Por favor, comparte tu ubicación para ayudar a encontrar a esta mascota'
                });
            }
            
            // Respuesta HTTP
            return res.status(200).json({
                success: true,
                qr: qrInfo,
                message: locationData ? '¡Gracias por compartir la ubicación!' : 'QR escaneado exitosamente'
            });
        } catch (error) {
            console.error('Error al escanear QR:', error);
            const statusCode = determineStatusCode(error);
            return res.status(statusCode).json({
                success: false,
                message: 'Error al escanear el QR',
                error: error.message
            });
        }
    },
    
    /**
     * Vincula un código QR a una mascota
     */
    linkQRToPet: async (req, res) => {
        try {
            const { qrId, petId } = req.body;
            const userId = req.user.id;
            const userRole = req.user.role;
            
            // Validación de datos de entrada
            if (!qrId || !petId) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requieren qrId y petId'
                });
            }
            
            // Delegación de la lógica de negocio a qrData
            const updatedQR = await qrData.linkQRToPet(qrId, petId, userId, userRole);
            
            // Respuesta HTTP
            return res.status(200).json({
                success: true,
                qr: updatedQR
            });
        } catch (error) {
            console.error('Error al vincular QR:', error);
            const statusCode = determineStatusCode(error);
            return res.status(statusCode).json({
                success: false,
                message: 'Error al vincular el QR',
                error: error.message
            });
        }
    },
    
    /**
     * Obtiene todos los códigos QR (solo administradores)
     */
    getAllQRs: async (req, res) => {
        try {
            const userRole = req.user.role;

            // Verificación de permisos
            if (userRole !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para acceder a esta información'
                });
            }

            // Delegación de la lógica de negocio a qrData
            const qrs = await qrData.getAllQRs();
            
            // Respuesta HTTP
            return res.status(200).json({
                success: true,
                qrs
            });
        } catch (error) {
            console.error('Error al obtener QRs:', error);
            const statusCode = determineStatusCode(error);
            return res.status(statusCode).json({
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
            
            // Delegación de la lógica de negocio a qrData
            const qrs = await qrData.getUserQRs(userId);
            
            // Respuesta HTTP
            return res.status(200).json({
                success: true,
                message: qrs.length > 0 ? `Se encontraron ${qrs.length} códigos QR` : 'No tienes QRs en lista',
                qrs: qrs || []
            });
        } catch (error) {
            console.error('Error al obtener QRs del usuario:', error);
            const statusCode = determineStatusCode(error);
            return res.status(statusCode).json({
                success: false,
                message: 'Error al obtener los QRs del usuario',
                error: error.message
            });
        }
    },
    
    /**
     * Desactiva un código QR (solo administradores)
     */
    deactivateQR: async (req, res) => {
        try {
            const { qrId } = req.params;
            const userId = req.user.id;
            const userRole = req.user.role;
            
            // Delegación de la lógica de negocio a qrData
            const updatedQR = await qrData.deactivateQR(qrId, userId, userRole);
            
            // Respuesta HTTP
            return res.status(200).json({
                success: true,
                message: 'QR desactivado exitosamente',
                qr: updatedQR
            });
        } catch (error) {
            console.error('Error al desactivar QR:', error);
            const statusCode = determineStatusCode(error);
            return res.status(statusCode).json({
                success: false,
                message: 'Error al desactivar el QR',
                error: error.message
            });
        }
    },
    
    /**
     * Elimina un código QR (para usuarios normales)
     */
    deleteQR: async (req, res) => {
        try {
            const { qrId } = req.params;
            const userId = req.user.id;
            
            // Delegación de la lógica de negocio a qrData
            const result = await qrData.deleteQR(qrId, userId);
            
            // Respuesta HTTP
            return res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            console.error('Error al eliminar QR:', error);
            const statusCode = determineStatusCode(error);
            return res.status(statusCode).json({
                success: false,
                message: 'Error al eliminar el QR',
                error: error.message
            });
        }
    },
    
    /**
     * Obtiene un QR específico por ID
     */
    getQRById: async (req, res) => {
        try {
            const qrId = req.params.id;
            
            // Delegación de la lógica de negocio a qrData
            const qrDetails = await qrData.getQRById(qrId);
            
            // Respuesta HTTP
            return res.status(200).json({
                success: true,
                message: 'Código QR encontrado',
                data: qrDetails
            });
        } catch (error) {
            console.error('Error al obtener código QR:', error);
            const statusCode = determineStatusCode(error);
            return res.status(statusCode).json({
                success: false,
                message: 'Error al obtener código QR',
                error: error.message
            });
        }
    },
    
    /**
     * Obtiene todos los QR de un usuario (para página "Mis QR")
     */
    getUserQRCodes: async (req, res) => {
        try {
            const userId = req.user.id;
            
            // Delegación de la lógica de negocio a qrData
            const qrCodes = await qrData.getUserQRCodes(userId);
            
            // Respuesta HTTP
            return res.status(200).json({
                success: true,
                message: qrCodes.length > 0 ? `Se encontraron ${qrCodes.length} códigos QR` : 'No se encontraron códigos QR',
                data: qrCodes
            });
        } catch (error) {
            console.error('Error al obtener códigos QR del usuario:', error);
            const statusCode = determineStatusCode(error);
            return res.status(statusCode).json({
                success: false,
                message: 'Error al obtener códigos QR',
                error: error.message
            });
        }
    },

    /**
     * Obtiene el historial de escaneos de un QR
     */
    getQRHistory: async (req, res) => {
        try {
            const { qrId } = req.params;
            const userId = req.user.id;
            
            // Delegación de la lógica de negocio a qrData
            const history = await qrData.getQRHistory(qrId, userId);
            
            // Respuesta HTTP
            return res.status(200).json({
                success: true,
                message: `Se encontraron ${history.length} escaneos para este QR`,
                history
            });
        } catch (error) {
            console.error('Error al obtener historial de QR:', error);
            const statusCode = determineStatusCode(error);
            return res.status(statusCode).json({
                success: false,
                message: 'Error al obtener historial de QR',
                error: error.message
            });
        }
    }
};

module.exports = qrController; 