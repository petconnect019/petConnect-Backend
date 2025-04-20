const express = require('express');
const router = express.Router();
const  QRController = require('../controllers/controllerQR/qrController');
const { verifyToken, isAdmin, optionalAuth } = require('../middlewares/authMiddleware');
const QRModel = require('../models/QRModel');

// Rutas públicas
router.get('/scan/:qrId', optionalAuth, QRController.scanQR);

// Middleware de autenticación para rutas protegidas
router.use(verifyToken);

// Rutas para usuarios normales
router.post('/link', QRController.linkQRToPet);
router.get('/user', QRController.getUserQRs);
router.delete('/:qrId', QRController.deleteQR);

// Rutas para administradores
router.use(isAdmin);
router.post('/generate', QRController.generateQR);
router.post('/generate-multiple', QRController.generateMultipleQRs);
router.get('/', QRController.getAllQRs);
router.delete('/admin/:qrId', QRController.deactivateQR);

// Obtener un QR específico por ID
router.get('/:id', async (req, res) => {
  try {
    const qrId = req.params.id;
    
    // Buscar el QR en la base de datos
    const qr = await QRModel.findById(qrId);
    
    if (!qr) {
      return res.status(404).json({
        success: false,
        message: 'Código QR no encontrado'
      });
    }
    
    // Devolver la información del QR
    return res.status(200).json({
      success: true,
      message: 'Código QR encontrado',
      data: {
        id: qr._id,
        orderId: qr.orderId,
        qrNumber: qr.qrNumber,
        content: qr.content,
        dataUrl: qr.dataUrl,
        isActive: qr.isActive,
        createdAt: qr.createdAt
      }
    });
  } catch (error) {
    console.error('Error al obtener código QR:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener código QR',
      error: error.message
    });
  }
});

// Obtener todos los QR de un usuario (para página "Mis QR")
router.get('/user/my-codes', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Consulta para obtener todos los QR del usuario
    // Primero obtenemos las órdenes del usuario
    const OrderModel = require('../models/OrderModel');
    const orders = await OrderModel.find({ 
      userId,
      status: 'ACCEPTED',
      paymentStatus: 'COMPLETED'
    });
    
    // Si no hay órdenes, devolver array vacío
    if (!orders.length) {
      return res.json({
        success: true,
        message: 'No se encontraron códigos QR',
        data: []
      });
    }
    
    // Extraer los IDs de los QR de todas las órdenes
    const qrIds = orders.reduce((acc, order) => {
      return acc.concat(order.qrCodes);
    }, []);
    
    // Obtener todos los QR
    const qrCodes = await QRModel.find({ 
      _id: { $in: qrIds },
      isActive: true 
    });
    
    return res.json({
      success: true,
      message: `Se encontraron ${qrCodes.length} códigos QR`,
      data: qrCodes
    });
  } catch (error) {
    console.error('Error al obtener códigos QR del usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener códigos QR',
      error: error.message
    });
  }
});

module.exports = router; 