const OrderModel = require('../models/OrderModel');
const QRModel = require('../models/QRModel');
const { generateQRImage } = require('../utils/qrData');
const { v4: uuidv4 } = require('uuid');

const orderController = {
    /**
     * Crear una nueva orden
     */
    createOrder: async (req, res) => {
        try {
            const { amount, qrCount } = req.body;
            const userId = req.userId;

            const order = new OrderModel({
                userId,
                amount,
                qrCount,
                status: 'pending'
            });

            await order.save();

            return {
                success: true,
                order
            };
        } catch (error) {
            console.error('Error al crear orden:', error);
            return {
                success: false,
                message: 'Error al crear la orden'
            };
        }
    },

    /**
     * Confirmar una orden y generar los QRs
     */
    confirmOrder: async (req, res) => {
        try {
            const { x_ref_payco, x_extra1 } = req.body;
            const orderId = x_extra1;

            // Buscar la orden
            const order = await OrderModel.findById(orderId);
            if (!order) {
                return {
                    success: false,
                    message: 'Orden no encontrada'
                };
            }

            // Verificar que el paymentId coincida
            if (order.paymentId && order.paymentId !== x_ref_payco) {
                return {
                    success: false,
                    message: 'ID de pago no coincide'
                };
            }

            // Generar códigos QR
            const qrCodes = [];
            for (let i = 0; i < order.qrCount; i++) {
                const qrId = uuidv4();
                const qrImage = await generateQRImage(qrId);
                
                const qr = new QRModel({
                    userId: order.userId,
                    orderId: order._id,
                    qrId,
                    qrImage,
                    status: 'active'
                });
                
                await qr.save();
                qrCodes.push(qr);
            }

            // Actualizar la orden
            order.paymentId = x_ref_payco;
            order.status = 'completed';
            order.qrCodes = qrCodes.map(qr => qr._id);
            await order.save();

            return {
                success: true,
                order: await order.populate('qrCodes')
            };
        } catch (error) {
            console.error('Error al confirmar orden:', error);
            return {
                success: false,
                message: 'Error al confirmar la orden'
            };
        }
    },

    /**
     * Obtener las órdenes de un usuario
     */
    getUserOrders: async (req, res) => {
        try {
            const { userId } = req.params;
            
            const orders = await OrderModel.find({ userId })
                .populate('qrCodes')
                .sort({ createdAt: -1 });

            res.json({
                success: true,
                orders
            });
        } catch (error) {
            console.error('Error al obtener órdenes:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener las órdenes'
            });
        }
    },

    getOrderById: async (req, res) => {
        try {
            const { orderId } = req.params;
            
            const order = await OrderModel.findById(orderId)
                .populate('qrCodes');

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Orden no encontrada'
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
                message: 'Error al obtener la orden'
            });
        }
    }
};

module.exports = orderController; 