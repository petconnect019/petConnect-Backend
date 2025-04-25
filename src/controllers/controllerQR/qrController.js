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
            const { count } = req.body;
            const userId = req.user.id;
            
            if (!count || count < 1 || count > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'La cantidad debe estar entre 1 y 100'
                });
            }
            
            const qrCodes = await qrData.generateMultipleQRs(userId, count);
            
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
     * Escanea un código QR
     */
    scanQR: async (req, res) => {
        try {
            const { qrId } = req.params;
            const scannerUserId = req.user ? req.user.id : null;
            
            const qrInfo = await qrData.scanQR(qrId, scannerUserId);
            
            res.json({
                success: true,
                qr: qrInfo
            });
        } catch (error) {
            console.error('Error al escanear QR:', error);
            
            if (error.message === 'QR no encontrado o ha sido eliminado') {
                return res.status(404).json({
                    success: false,
                    message: 'QR no encontrado o ha sido eliminado'
                });
            }
            
            if (error.message === 'Mascota no encontrada') {
                return res.status(404).json({
                    success: false,
                    message: 'Mascota no encontrada'
                });
            }
            
            res.status(500).json({
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
            
            const updatedQR = await qrData.linkQRToPet(qrId, petId, userId, userRole);
            
            res.json({
                success: true,
                qr: updatedQR
            });
        } catch (error) {
            console.error('Error al vincular QR:', error);
            
            if (error.message === 'QR no encontrado o ha sido eliminado') {
                return res.status(404).json({
                    success: false,
                    message: 'QR no encontrado o ha sido eliminado'
                });
            }
            
            if (error.message === 'Este QR ya está vinculado a una mascota') {
                return res.status(400).json({
                    success: false,
                    message: 'Este QR ya está vinculado a una mascota'
                });
            }
            
            if (error.message === 'Mascota no encontrada') {
                return res.status(404).json({
                    success: false,
                    message: 'Mascota no encontrada'
                });
            }
            
            if (error.message === 'No tienes permiso para vincular este QR a esta mascota') {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para vincular este QR a esta mascota'
                });
            }
            
            res.status(500).json({
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
        const userRole = req.user.role;

        // Verificar si el usuario es administrador
        if (userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para acceder a esta información'
            });
        }

        try {
            const qrs = await qrData.getAllQRs();
            
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
            const qrs = await qrData.getUserQRs(userId);
            
            if (!qrs || qrs.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No tienes QRs en lista'
                });
            }
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
     * Desactiva un código QR (solo administradores)
     */
    deactivateQR: async (req, res) => {
        try {
            const { qrId } = req.params;
            const userId = req.user.id;
            const userRole = req.user.role;
            
            const updatedQR = await qrData.deactivateQR(qrId, userId, userRole);
            
            res.json({
                success: true,
                message: 'QR desactivado exitosamente',
                qr: updatedQR
            });
        } catch (error) {
            console.error('Error al desactivar QR:', error);
            
            if (error.message === 'QR no encontrado') {
                return res.status(404).json({
                    success: false,
                    message: 'QR no encontrado'
                });
            }
            
            if (error.message === 'Solo los administradores pueden desactivar códigos QR') {
                return res.status(403).json({
                    success: false,
                    message: 'Solo los administradores pueden desactivar códigos QR'
                });
            }
            
            res.status(500).json({
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
            
            const result = await qrData.deleteQR(qrId, userId);
            
            res.json({
                success: true,
                message: result.message
            });
        } catch (error) {
            console.error('Error al eliminar QR:', error);
            
            if (error.message === 'QR no encontrado') {
                return res.status(404).json({
                    success: false,
                    message: 'QR no encontrado'
                });
            }
            
            if (error.message === 'No tienes permiso para eliminar este QR') {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para eliminar este QR'
                });
            }
            
            if (error.message === 'No se puede eliminar un QR que está vinculado a una mascota. Desvincúlalo primero.') {
                return res.status(400).json({
                    success: false,
                    message: 'No se puede eliminar un QR que está vinculado a una mascota. Desvincúlalo primero.'
                });
            }
            
            res.status(500).json({
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