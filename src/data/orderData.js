const OrderModel = require('../models/OrderModel');
const QRModel = require('../models/QRModel');
const UserModel = require('../models/UserModel');
const crypto = require('crypto');
const QRCode = require('qrcode');
const stripeService = require('../services/stripeService');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const mongoose = require('mongoose');

const orderData = {
    /**
     * Crear una nueva orden
     * @param {Object} orderData - Datos de la orden
     * @param {string} orderData.userId - ID del usuario
     * @param {number} orderData.quantity - Cantidad de QRs
     * @param {Object} orderData.shippingDetails - Detalles de envío
     * @param {string} orderData.customerName - Nombre del cliente
     * @param {string} orderData.customerEmail - Email del cliente
     */
    createOrder: async (orderData) => {
        const { userId, quantity, shippingDetails, customerName, customerEmail } = orderData;
        
        // Calcular el precio total (en centavos para Stripe)
        const unitPrice = 1000; // $10.00 en centavos
        const totalAmount = quantity * unitPrice;
        
        // Iniciar sesión de transacción
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            // Preparar información del cliente para Stripe
            let customerInfo = {
                name: customerName,
                email: customerEmail,
                city: shippingDetails?.city
            };
            
            // Si no se proporciona nombre o email, obtener del usuario
            if (!customerName || !customerEmail) {
                const user = await UserModel.findById(userId);
                if (!user) {
                    throw new Error('Usuario no encontrado');
                }
                
                customerInfo = {
                    name: customerName || user.name,
                    email: customerEmail || user.email,
                    city: shippingDetails?.city || user.city
                };
            }
            
            // Crear un payment intent en Stripe
            const paymentIntent = await stripeService.createPaymentIntent(
                totalAmount, 
                'usd', 
                {
                    userId,
                    quantity,
                    order_id: null // Se actualizará después de crear la orden
                },
                customerInfo
            );
            
            // Crear la orden en la base de datos dentro de la transacción
            const order = await OrderModel.create([{
                userId,
                quantity,
                totalAmount: totalAmount / 100, // Guardar en dólares en la BD
                paymentId: paymentIntent.paymentIntentId,
                status: 'pending',
                shippingDetails,
                customerName: customerInfo.name,
                customerEmail: customerInfo.email
            }], { session });
            
            // Actualizar el order_id en los metadatos del PaymentIntent
            await stripe.paymentIntents.update(paymentIntent.paymentIntentId, {
                metadata: {
                    userId,
                    quantity,
                    order_id: order[0]._id.toString()
                }
            });
            
            // Confirmar la transacción
            await session.commitTransaction();
            session.endSession();
            
            return {
                order: order[0],
                clientSecret: paymentIntent.clientSecret
            };
        } catch (error) {
            // Revertir la transacción en caso de error
            await session.abortTransaction();
            session.endSession();
            
            console.error('Error al crear orden:', error);
            throw new Error(`Error al crear orden: ${error.message}`);
        }
    },
    
    /**
     * Confirmar el pago de una orden
     * @param {string} orderId - ID de la orden
     * @param {boolean} forceConfirm - Forzar confirmación para pruebas
     */
    confirmPayment: async (orderId, forceConfirm = false) => {
        // Iniciar sesión de transacción
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            // Buscar la orden
            const order = await OrderModel.findById(orderId).session(session);
            
            if (!order) {
                throw new Error('Orden no encontrada');
            }
            
            // Verificar el estado del pago en Stripe
            const paymentStatus = await stripeService.confirmPayment(order.paymentId, forceConfirm);
            
            if (paymentStatus.status !== 'succeeded') {
                throw new Error(`El pago no ha sido completado. Estado: ${paymentStatus.status}`);
            }
            
            // Actualizar el estado de la orden dentro de la transacción
            const updatedOrder = await OrderModel.findByIdAndUpdate(
                orderId,
                { status: 'completed' },
                { new: true, session }
            );
            
            // Generar códigos QR para la orden dentro de la transacción
            const qrCodes = [];
            for (let i = 0; i < order.quantity; i++) {
                const qrId = crypto.randomBytes(8).toString('hex');
                const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
                const qrUrl = `${baseUrl}/api/qr/scan/${qrId}`;
                const qrImage = await QRCode.toDataURL(qrUrl);
                
                const qr = await QRModel.create([{
                    qrId,
                    userId: order.userId,
                    orderId: order._id,
                    isLinked: false,
                    isActive: true,
                    qrImage
                }], { session });
                
                qrCodes.push(qr[0]);
            }
            
            // Confirmar la transacción
            await session.commitTransaction();
            session.endSession();
            
            return { order: updatedOrder, qrCodes };
        } catch (error) {
            // Revertir la transacción en caso de error
            await session.abortTransaction();
            session.endSession();
            
            console.error('Error al confirmar pago:', error);
            throw new Error(`Error al confirmar pago: ${error.message}`);
        }
    },
    
    /**
     * Obtener todas las órdenes de un usuario
     * @param {string} userId - ID del usuario
     */
    getUserOrders: async (userId) => {
        const orders = await OrderModel.find({ userId });
        return orders;
    },
    
    /**
     * Obtener una orden específica
     * @param {string} orderId - ID de la orden
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