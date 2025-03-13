const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const petRoutes = require('./petRoutes');
const qrRoutes = require('./qrRoutes');
const orderRoutes = require('./orderRoutes');
const testRoutes = require('./testRoutes');
const chatRoutes = require('./chatRoutes');
const AdminData = require('../data/adminData');

// Configuración de rutas
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/pets', petRoutes);
router.use('/qr', qrRoutes);
router.use('/orders', orderRoutes);
router.use('/test', testRoutes);
router.use('/chat', chatRoutes);



module.exports = router; 