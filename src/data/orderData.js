const OrderModel = require('../models/OrderModel');
const QRModel = require('../models/QRModel');
const qrData = require('./qrData');

const orderData = {
    createOrder: async function(orderInfo) {
        try {
            const { quantity, shippingDetails, customerName, customerEmail, customerLastName, docNumber } = orderInfo;

            // Validar datos básicos
            if (!quantity || quantity < 1) {
                throw new Error('La cantidad debe ser mayor a 0');
            }

            const unitPrice = 15000;
            const totalAmount = quantity * unitPrice;

            // Crear orden
            const order = new OrderModel(orderInfo);
            await order.save();

            return order;
        } catch (error) {
            console.error('Error al crear orden:', error);
            throw error;
        }
    },

    confirmOrder: async function(orderId) {
        try {
            // Generar QRs
            const order = await OrderModel.findById(orderId);
            if (!order) {
                throw new Error('Orden no encontrada');
            }

            const generatedQRs = await qrData.generateMultipleQRs(order.userId, order.quantity, order._id);
            
            // Actualizar los QRs con el orderId
            for (const qr of generatedQRs) {
                await QRModel.findByIdAndUpdate(qr._id, { orderId: order._id });
            }

            // Actualizar orden con los QRs y cambiar estado
            const updatedOrder = await OrderModel.findByIdAndUpdate(
                order._id,
                {
                    status: 'completed',
                    paymentStatus: 'COMPLETED',
                    qrCodes: generatedQRs.map(qr => qr._id)
                },
                { 
                    new: true,
                    populate: {
                        path: 'qrCodes',
                        select: 'code status'
                    }
                }
            );

            return {
                order: updatedOrder,
                qrCodes: generatedQRs
            };
        } catch (error) {
            console.error('Error al confirmar orden:', error);
            throw error;
        }
    },

    getOrderById: async function(orderId) {
        const order = await OrderModel.findById(orderId)
            .populate('qrCodes', 'qrId qrImage isLinked isActive');
        
        if (!order) {
            throw new Error('Orden no encontrada');
        }

        return order;
    },

    getUserOrders: async function(userId) {
        return await OrderModel.find({ userId })
            .sort({ createdAt: -1 })
            .populate('qrCodes', 'qrId qrImage isLinked isActive');
    },

    // Actualizar la información de pago de una orden
    updateOrderPayment: async function(orderId, paymentInfo) {
        try {
            // Actualizar la orden con la información de pago
            const updatedOrder = await OrderModel.findByIdAndUpdate(
                orderId,
                {
                    paymentStatus: paymentInfo.paymentStatus,
                    epaycoRef: paymentInfo.epaycoRef,
                    paymentData: paymentInfo.paymentData
                },
                { new: true }
            );
            
            if (!updatedOrder) {
                throw new Error(`Orden ${orderId} no encontrada para actualizar pago`);
            }
            
            return updatedOrder;
        } catch (error) {
            console.error(`Error al actualizar información de pago para orden ${orderId}:`, error);
            throw error;
        }
    }
};

module.exports = orderData; 