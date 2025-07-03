const express = require('express');
const router = express.Router();
const QRController = require('../controllers/controllerQR/qrController');
const { verifyToken, isAdmin, optionalAuth } = require('../middlewares/authMiddleware');
const { sendEmail } = require('../services/emailService');

// Rutas públicas
router.get('/scan/:qrId', optionalAuth, QRController.scanQR);

// Ruta para obtener historial de escaneos de un QR
router.get('/:qrId/history', verifyToken, QRController.getQRHistory);

// Ruta para registro manual de escaneos
router.post('/manual-scan/:qrId', optionalAuth, QRController.registerManualScan);

// Middleware de autenticación para rutas protegidas
router.use(verifyToken);

// Rutas para usuarios normales
router.post('/link', QRController.linkQRToPet);
router.get('/user', QRController.getUserQRs);
router.delete('/:qrId', QRController.deleteQR);

// Rutas para administradores
router.use(isAdmin);
router.post('/generate-multiple', QRController.generateMultipleQRs);
router.post('/user/:userId', QRController.generateUserQR);
router.get('/', QRController.getAllQRs);
router.delete('/admin/:qrId', QRController.deactivateQR);

// Ruta de prueba para el email
router.post('/test-email', async (req, res) => {
    try {
        const result = await sendEmail({
            to: req.user.email, // Envía al email del usuario autenticado
            subject: 'Prueba de configuración de email - PetConnect',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #f97316;">¡La configuración de email funciona!</h2>
                    <p>Este es un correo de prueba para verificar la configuración del servicio de email en PetConnect.</p>
                    <p>Si estás recibiendo este correo, significa que todo está configurado correctamente.</p>
                    <div style="margin-top: 20px; padding: 15px; background-color: #fff7ed; border-radius: 8px;">
                        <p style="margin: 0; color: #9a3412;">Ahora podrás recibir notificaciones cuando alguien escanee el QR de tu mascota.</p>
                    </div>
                </div>
            `
        });

        if (result.error) {
            return res.status(500).json({
                success: false,
                message: 'Error al enviar el email de prueba',
                error: result.message
            });
        }

        res.json({
            success: true,
            message: 'Email de prueba enviado correctamente'
        });
    } catch (error) {
        console.error('Error en la ruta de prueba de email:', error);
        res.status(500).json({
            success: false,
            message: 'Error al enviar el email de prueba',
            error: error.message
        });
    }
});

module.exports = router; 