/**
 * Rutas de prueba para crear ordenes, mascotas, QRs y vincularlos
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const crypto = require('crypto');

// Middleware simple para simular autenticación
router.use((req, res, next) => {
    req.user = {
        id: 'test-user-123',
        name: 'Usuario de Prueba',
        email: 'test@example.com',
        role: 'user'
    };
    next();
});

// Ruta de información
router.get('/', (req, res) => {
    res.json({
        message: 'API de prueba para PetConnect',
        endpoints: [
            { method: 'POST', path: '/test/order', description: 'Crear una orden de prueba' },
            { method: 'POST', path: '/test/order/:orderId/confirm', description: 'Confirmar una orden' },
            { method: 'POST', path: '/test/pet', description: 'Crear una mascota de prueba' },
            { method: 'POST', path: '/test/qr', description: 'Generar un código QR' },
            { method: 'POST', path: '/test/qr/link', description: 'Vincular un QR a una mascota' },
            { method: 'GET', path: '/test/qr/:qrId', description: 'Escanear un código QR' }
        ]
    });
});

// Función para generar un ID único
const generateId = () => {
    return Date.now().toString() + Math.random().toString(36).substring(2, 15);
};

// Crear una orden de prueba
router.post('/order', (req, res) => {
    try {
        const { quantity = 1 } = req.body;
        const totalAmount = quantity * 15600;
        
        const order = {
            _id: generateId(),
            userId: req.user.id,
            quantity,
            totalAmount,
            status: 'pending',
            paymentId: 'test_payment_' + Date.now(),
            createdAt: new Date()
        };
        
        // Guardar la orden en la sesión para pruebas
        if (!req.app.locals.testOrders) {
            req.app.locals.testOrders = [];
        }
        req.app.locals.testOrders.push(order);
        
        res.status(201).json({
            success: true,
            order,
            clientSecret: 'test_secret_' + Date.now()
        });
    } catch (error) {
        console.error('Error al crear orden de prueba:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear la orden de prueba'
        });
    }
});

// Confirmar una orden
router.post('/order/:orderId/confirm', (req, res) => {
    try {
        const { orderId } = req.params;
        
        // Buscar la orden en la sesión
        if (!req.app.locals.testOrders) {
            return res.status(404).json({
                success: false,
                message: 'No hay órdenes de prueba'
            });
        }
        
        const orderIndex = req.app.locals.testOrders.findIndex(o => o._id === orderId);
        
        if (orderIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Orden no encontrada'
            });
        }
        
        // Actualizar el estado de la orden
        req.app.locals.testOrders[orderIndex].status = 'completed';
        const order = req.app.locals.testOrders[orderIndex];
        
        // Generar códigos QR para la orden
        const qrCodes = [];
        for (let i = 0; i < order.quantity; i++) {
            const qrCode = {
                _id: generateId(),
                qrId: crypto.randomBytes(8).toString('hex'),
                userId: order.userId,
                isLinked: false,
                isActive: true,
                createdAt: new Date()
            };
            
            // Guardar el QR en la sesión
            if (!req.app.locals.testQRs) {
                req.app.locals.testQRs = [];
            }
            req.app.locals.testQRs.push(qrCode);
            qrCodes.push(qrCode);
        }
        
        res.json({
            success: true,
            order,
            qrCodes
        });
    } catch (error) {
        console.error('Error al confirmar orden de prueba:', error);
        res.status(500).json({
            success: false,
            message: 'Error al confirmar la orden de prueba'
        });
    }
});

// Crear una mascota de prueba
router.post('/pet', (req, res) => {
    try {
        const {
            name,
            species,
            breed,
            age,
            color,
            weight,
            description,
            medicalInfo
        } = req.body;
        
        const pet = {
            _id: generateId(),
            name,
            species,
            breed,
            age,
            color,
            weight,
            description,
            medicalInfo,
            owner: req.user.id,
            createdAt: new Date()
        };
        
        // Guardar la mascota en la sesión
        if (!req.app.locals.testPets) {
            req.app.locals.testPets = [];
        }
        req.app.locals.testPets.push(pet);
        
        res.status(201).json({
            success: true,
            pet
        });
    } catch (error) {
        console.error('Error al crear mascota de prueba:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear la mascota de prueba'
        });
    }
});

// Generar un código QR
router.post('/qr', (req, res) => {
    try {
        const qr = {
            _id: generateId(),
            qrId: crypto.randomBytes(8).toString('hex'),
            userId: req.user.id,
            isLinked: false,
            isActive: true,
            createdAt: new Date()
        };
        
        // Guardar el QR en la sesión
        if (!req.app.locals.testQRs) {
            req.app.locals.testQRs = [];
        }
        req.app.locals.testQRs.push(qr);
        
        res.status(201).json({
            success: true,
            qr
        });
    } catch (error) {
        console.error('Error al generar QR de prueba:', error);
        res.status(500).json({
            success: false,
            message: 'Error al generar el QR de prueba'
        });
    }
});

// Vincular un QR a una mascota
router.post('/qr/link', (req, res) => {
    try {
        const { qrId, petId } = req.body;
        
        // Verificar si el QR existe
        if (!req.app.locals.testQRs) {
            return res.status(404).json({
                success: false,
                message: 'No hay QRs de prueba'
            });
        }
        
        const qrIndex = req.app.locals.testQRs.findIndex(q => q.qrId === qrId);
        
        if (qrIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'QR no encontrado'
            });
        }
        
        // Verificar si la mascota existe
        if (!req.app.locals.testPets) {
            return res.status(404).json({
                success: false,
                message: 'No hay mascotas de prueba'
            });
        }
        
        const petIndex = req.app.locals.testPets.findIndex(p => p._id === petId);
        
        if (petIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Mascota no encontrada'
            });
        }
        
        // Actualizar el QR
        req.app.locals.testQRs[qrIndex].petId = petId;
        req.app.locals.testQRs[qrIndex].isLinked = true;
        
        const qr = req.app.locals.testQRs[qrIndex];
        
        res.json({
            success: true,
            qr
        });
    } catch (error) {
        console.error('Error al vincular QR de prueba:', error);
        res.status(500).json({
            success: false,
            message: 'Error al vincular el QR de prueba'
        });
    }
});

// Escanear un código QR
router.get('/qr/:qrId', (req, res) => {
    try {
        const { qrId } = req.params;
        
        // Verificar si el QR existe
        if (!req.app.locals.testQRs) {
            return res.status(404).json({
                success: false,
                message: 'No hay QRs de prueba'
            });
        }
        
        const qr = req.app.locals.testQRs.find(q => q.qrId === qrId);
        
        if (!qr) {
            return res.status(404).json({
                success: false,
                message: 'QR no encontrado'
            });
        }
        
        // Verificar si el QR está vinculado a una mascota
        if (!qr.isLinked || !qr.petId) {
            return res.json({
                success: true,
                qr: {
                    qrId: qr.qrId,
                    isLinked: false,
                    message: 'Este QR no está vinculado a ninguna mascota'
                }
            });
        }
        
        // Buscar la mascota
        const pet = req.app.locals.testPets.find(p => p._id === qr.petId);
        
        if (!pet) {
            return res.status(404).json({
                success: false,
                message: 'Mascota no encontrada'
            });
        }
        
        res.json({
            success: true,
            qr: {
                qrId: qr.qrId,
                isLinked: true,
                isActive: qr.isActive,
                pet: {
                    _id: pet._id,
                    name: pet.name,
                    species: pet.species,
                    breed: pet.breed,
                    age: pet.age,
                    color: pet.color,
                    description: pet.description,
                    owner: {
                        id: pet.owner,
                        name: 'Dueño de la mascota'
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error al escanear QR de prueba:', error);
        res.status(500).json({
            success: false,
            message: 'Error al escanear el QR de prueba'
        });
    }
});

// Obtener todas las órdenes
router.get('/orders', (req, res) => {
    try {
        const orders = req.app.locals.testOrders || [];
        
        res.json({
            success: true,
            orders
        });
    } catch (error) {
        console.error('Error al obtener órdenes de prueba:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las órdenes de prueba'
        });
    }
});

// Obtener todas las mascotas
router.get('/pets', (req, res) => {
    try {
        const pets = req.app.locals.testPets || [];
        
        res.json({
            success: true,
            pets
        });
    } catch (error) {
        console.error('Error al obtener mascotas de prueba:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las mascotas de prueba'
        });
    }
});

// Obtener todos los QRs
router.get('/qrs', (req, res) => {
    try {
        const qrs = req.app.locals.testQRs || [];
        
        res.json({
            success: true,
            qrs
        });
    } catch (error) {
        console.error('Error al obtener QRs de prueba:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los QRs de prueba'
        });
    }
});

module.exports = router; 