const OrderModel = require('../models/OrderModel');
const QRModel = require('../models/QRModel');
const crypto = require('crypto');
const QRCode = require('qrcode');

const orderController = {
    // Crear una nueva orden
    createOrder: async (req, res) => {
        try {
            const { quantity, shippingDetails } = req.body;
            const userId = req.user.id;

            if (!quantity || quantity < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'La cantidad debe ser al menos 1'
                });
            }

            // Calcular el precio total (ejemplo: $10 por QR)
            const totalAmount = quantity * 10;

            // Crear la orden en la base de datos
            const order = await OrderModel.create({
                userId,
                quantity,
                totalAmount,
                paymentId: 'payment_' + Date.now(),
                status: 'pending',
                shippingDetails
            });

            res.status(201).json({
                success: true,
                order,
                clientSecret: 'client_secret_' + Date.now() // Simulado para pruebas
            });
        } catch (error) {
            console.error('Error al crear orden:', error);
            res.status(500).json({
                success: false,
                message: 'Error al crear la orden',
                error: error.message
            });
        }
    },

    // Confirmar pago de orden
    confirmPayment: async (req, res) => {
        try {
            const { orderId } = req.params;
            
            // Buscar y actualizar la orden
            const order = await OrderModel.findByIdAndUpdate(
                orderId,
                { status: 'completed' },
                { new: true }
            );

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Orden no encontrada'
                });
            }

            // Generar códigos QR para la orden
            const qrCodes = [];
            for (let i = 0; i < order.quantity; i++) {
                const qrId = crypto.randomBytes(8).toString('hex');
                const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
                const qrUrl = `${baseUrl}/api/qr/scan/${qrId}`;
                const qrImage = await QRCode.toDataURL(qrUrl);
                
                const qr = await QRModel.create({
                    qrId,
                    userId: order.userId,
                    orderId: order._id,
                    isLinked: false,
                    isActive: true,
                    qrImage
                });
                
                qrCodes.push(qr);
            }

            res.json({
                success: true,
                order,
                qrCodes
            });
        } catch (error) {
            console.error('Error al confirmar pago:', error);
            res.status(500).json({
                success: false,
                message: 'Error al confirmar el pago',
                error: error.message
            });
        }
    },

    // Obtener órdenes del usuario
    getUserOrders: async (req, res) => {
        try {
            const userId = req.user.id;
            const orders = await OrderModel.find({ userId });

            res.json({
                success: true,
                orders
            });
        } catch (error) {
            console.error('Error al obtener órdenes:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener las órdenes',
                error: error.message
            });
        }
    },

    // Obtener una orden específica
    getOrderById: async (req, res) => {
        try {
            const { orderId } = req.params;
            const order = await OrderModel.findById(orderId);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Orden no encontrada'
                });
            }

            // Verificar si el usuario tiene permiso para ver esta orden
            if (order.userId.toString() !== req.user.id && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para ver esta orden'
                });
            }

            res.json({
                success: true,
                order
            });
        } catch (error) {
            console.error('Error al obtener orden:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener la orden',
                error: error.message
            });
        }
    }
};

module.exports = orderController; 