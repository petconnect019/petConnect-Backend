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
            // Verificar que la orden existe
            const order = await OrderModel.findById(orderId);
            if (!order) {
                throw new Error('Orden no encontrada');
            }
            
            // Verificar si la orden ya tiene QRs generados
            if (order.qrCodes && order.qrCodes.length > 0) {
                console.log(`La orden ${orderId} ya tiene ${order.qrCodes.length} QRs generados`);
                return {
                    order,
                    qrCodes: []
                };
            }

            console.log(`Generando ${order.quantity} QRs para la orden ${orderId}`);
            
            try {
                // Generar QRs
                const generatedQRs = await qrData.generateMultipleQRs(order.userId, order.quantity, order._id);
                
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
                            select: 'qrImage isLinked isActive'
                        }
                    }
                );

                return {
                    order: updatedOrder,
                    qrCodes: generatedQRs
                };
            } catch (error) {
                console.error(`Error al generar QRs: ${error.message}`);
                
                // Intentar actualizar el estado de la orden sin generar QRs
                const updatedOrder = await OrderModel.findByIdAndUpdate(
                    order._id,
                    {
                        status: 'completed',
                        paymentStatus: 'COMPLETED'
                    },
                    { new: true }
                );
                
                throw new Error(`Error al generar códigos QR: ${error.message}`);
            }
        } catch (error) {
            console.error('Error al confirmar orden:', error);
            throw error;
        }
    },

    getOrderById: async function(orderId) {
        const order = await OrderModel.findById(orderId)
            .populate('qrCodes', 'qrImage isLinked isActive');
        
        if (!order) {
            throw new Error('Orden no encontrada');
        }

        return order;
    },

    getUserOrders: async function(userId) {
        return await OrderModel.find({ userId })
            .sort({ createdAt: -1 })
            .populate('qrCodes', 'qrImage isLinked isActive');
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
    },

    /**
     * Cancela una orden existente
     * @param {string} orderId - ID de la orden a cancelar
     * @param {string} userId - ID del usuario que realiza la cancelación
     * @returns {Object} Orden actualizada
     */
    cancelOrder: async function(orderId, userId) {
        try {
            // Verificar que la orden existe y pertenece al usuario
            const order = await OrderModel.findOne({ _id: orderId, userId });
            if (!order) {
                throw new Error('Orden no encontrada o no tienes permiso para cancelarla');
            }

            // Actualizar el estado de la orden
            const updatedOrder = await OrderModel.findByIdAndUpdate(
                orderId,
                {
                    status: 'failed',
                    paymentStatus: 'FAILED',
                    updatedAt: new Date()
                },
                { new: true }
            );

            return updatedOrder;
        } catch (error) {
            console.error(`Error al cancelar orden ${orderId}:`, error);
            throw error;
        }
    }
};

module.exports = orderData; 