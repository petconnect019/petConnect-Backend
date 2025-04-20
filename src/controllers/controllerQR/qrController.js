const qrData = require('../../data/qrData');
const QRModel = require('../../models/QRModel');

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
            const { quantity, orderId } = req.body;
            
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
            
            console.log(`Generando ${quantity} códigos QR...`);
            
            const qrPromises = [];
            const qrReferences = [];
            
            for (let i = 1; i <= quantity; i++) {
                console.log(`Generando QR ${i} con contenido: OrderId: ${orderId} - QR number: ${i}`);
                
                // Crear el QR con la estructura correcta - Eliminando referencias a qrId
                const newQR = new QRModel({
                    orderId,
                    content: `OrderId: ${orderId} - QR number: ${i}`,
                    dataUrl: await qrUtils.generateQRUrl(`OrderId: ${orderId} - QR number: ${i}`),
                    qrNumber: i,
                    isLinked: false,
                    isActive: true,
                    petId: null
                });
                
                // Guardar el QR
                qrPromises.push(newQR.save());
                qrReferences.push(newQR._id);
            }
            
            // Esperar a que todos los QR se guarden
            await Promise.all(qrPromises);
            
            console.log(`Se generaron ${quantity} códigos QR con éxito`);
            
            return res.status(201).json({
                success: true,
                message: `Se generaron ${quantity} códigos QR con éxito`,
                data: {
                    quantity,
                    orderId,
                    qrReferences
                }
            });
        } catch (error) {
            console.error('Error al generar códigos QR:', error);
            return res.status(500).json({
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
    }
};

module.exports = qrController; 