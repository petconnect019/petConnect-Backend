const qrData = require('../../data/qrData');

const qrController = {
    /**
     * Genera un nuevo código QR
     */
    generateQR: async (req, res) => {
        try {
            const userId = req.user.id;
            const qr = await qrData.generateQR(userId);
            
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
     * Escanea un código QR (versión actualizada)
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
            
            if (error.message === 'QR no encontrado o inactivo') {
                return res.status(404).json({
                    success: false,
                    message: 'QR no encontrado o inactivo'
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
     * Vincula un código QR a una mascota (versión actualizada)
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
            
            if (error.message === 'QR no encontrado o inactivo') {
                return res.status(404).json({
                    success: false,
                    message: 'QR no encontrado o inactivo'
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
     * Obtiene todos los códigos QR
     */
    getAllQRs: async (req, res) => {
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
            const userId = req.user.id;
            const userRole = req.user.role;
            
            const updatedQR = await qrData.deactivateQR(qrId, userId, userRole);
            
            res.json({
                success: true,
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
            
            if (error.message === 'No tienes permiso para desactivar este QR') {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para desactivar este QR'
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Error al desactivar el QR',
                error: error.message
            });
        }
    }
};

module.exports = qrController; 