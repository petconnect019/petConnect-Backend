const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const petRoutes = require('./petRoutes');
const qrRoutes = require('./qrRoutes');
const orderRoutes = require('./orderRoutes');
const testRoutes = require('./testRoutes');
const chatRoutes = require('./chatRoutes');
const adminRoutes = require('./adminRoutes');
const stripeRoutes = require('./stripeRoutes');
const paymentRoutes = require('./payment.routes');
const AdminData = require('../data/adminData');

// Endpoint de salud para verificar la conexión
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Endpoint directo para pruebas de confirmación cliente ePayco
router.post('/payments/epayco/client-confirmation-test', (req, res) => {
  console.log('Test de confirmación cliente recibido:', req.body);
  res.status(200).json({
    success: true,
    message: 'Test de confirmación recibido correctamente',
    body: req.body
  });
});

// Configuración de rutas
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/pets', petRoutes);
router.use('/qr', qrRoutes);
router.use('/orders', orderRoutes);
router.use('/test', testRoutes);
router.use('/chat', chatRoutes);
router.use('/admin', adminRoutes);
router.use('/stripe', stripeRoutes);
router.use('/payments', paymentRoutes);

module.exports = router; 