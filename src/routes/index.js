const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const petRoutes = require('./petRoutes');
const qrRoutes = require('./qrRoutes');
const orderRoutes = require('./orderRoutes');
const chatRoutes = require('./chatRoutes');
const adminRoutes = require('./adminRoutes');
const paymentRoutes = require('./paymentRoutes');
const healthRoutes = require('./healthRoutes');
const vetDocumentRoutes = require('./vetDocumentRoutes');
const notificationRoutes = require('./notificationRoutes');
const AdminData = require('../data/adminData');

// Configuración de rutas
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/pets', petRoutes);
router.use('/qr', qrRoutes);
router.use('/orders', orderRoutes);
router.use('/chat', chatRoutes);
router.use('/admin', adminRoutes);
router.use('/payments', paymentRoutes);
router.use('/health', healthRoutes);
router.use('/vet', vetDocumentRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router; 
