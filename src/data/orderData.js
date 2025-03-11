const OrderModel = require('../models/OrderModel');
const QRModel = require('../models/QRModel');
const crypto = require('crypto');
const QRCode = require('qrcode');

const orderData = {
    /**
     * Crear una nueva orden
     * @param {Object} orderData - Datos de la orden
     * @param {string} orderData.userId - ID del usuario
     * @param {number} orderData.quantity - Cantidad de QRs
     * @param {Object} orderData.shippingDetails - Detalles de envío
     * @returns {Promise<Object>} - La orden creada
     */
    createOrder: async (orderData) => {
        const { userId, quantity, shippingDetails } = orderData;
        
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
        
        return {
            order,
            clientSecret: 'client_secret_' + Date.now() // Simulado para pruebas
        };
    },
    
    /**
     * Confirmar el pago de una orden
     * @param {string} orderId - ID de la orden
     * @returns {Promise<Object>} - La orden actualizada y los QRs generados
     */
    confirmPayment: async (orderId) => {
        // Buscar y actualizar la orden
        const order = await OrderModel.findByIdAndUpdate(
            orderId,
            { status: 'completed' },
            { new: true }
        );
        
        if (!order) {
            throw new Error('Orden no encontrada');
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
        
        return { order, qrCodes };
    },
    
    /**
     * Obtener todas las órdenes de un usuario
     * @param {string} userId - ID del usuario
     * @returns {Promise<Array>} - Lista de órdenes
     */
    getUserOrders: async (userId) => {
        const orders = await OrderModel.find({ userId });
        return orders;
    },
    
    /**
     * Obtener una orden específica
     * @param {string} orderId - ID de la orden
     * @returns {Promise<Object>} - La orden
     */
    getOrderById: async (orderId) => {
        const order = await OrderModel.findById(orderId);
        
        if (!order) {
            throw new Error('Orden no encontrada');
        }
        
        return order;
    },
    
    /**
     * Verificar si un usuario tiene permiso para ver una orden
     * @param {string} orderId - ID de la orden
     * @param {string} userId - ID del usuario
     * @param {string} userRole - Rol del usuario
     * @returns {Promise<boolean>} - true si tiene permiso, false si no
     */
    hasPermissionForOrder: async (orderId, userId, userRole) => {
        const order = await OrderModel.findById(orderId);
        
        if (!order) {
            throw new Error('Orden no encontrada');
        }
        
        return order.userId.toString() === userId || userRole === 'admin';
    }
};

module.exports = orderData; 