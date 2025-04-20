const OrderModel = require('../models/OrderModel');
const QRModel = require('../models/QRModel');
const qrData = require('./qrData');

const orderData = {
    async createOrder(orderInfo, userId) {
        try {
            const { quantity, shippingDetails, customerName, customerEmail, customerLastName, docNumber } = orderInfo;

            // Validar datos básicos
            if (!quantity || quantity < 1) {
                throw new Error('La cantidad debe ser mayor a 0');
            }

            const unitPrice = 15000;
            const totalAmount = quantity * unitPrice;

            // Crear orden
            const order = await OrderModel.create({
                userId,
                quantity,
                totalAmount,
                status: 'pending',
                paymentStatus: 'PENDING',
                shippingDetails,
                customerName,
                customerEmail,
                customerLastName,
                docNumber
            });

            // Generar QRs inmediatamente
            const generatedQRs = await qrData.generateMultipleQRs(userId, quantity, order._id);
            
            // Actualizar los QRs con el orderId
            for (const qr of generatedQRs) {
                await QRModel.findByIdAndUpdate(qr._id, { orderId: order._id });
            }

            // Actualizar orden con los QRs
            const updatedOrder = await OrderModel.findByIdAndUpdate(
                order._id,
                {
                    status: 'COMPLETED',
                    paymentStatus: 'COMPLETED',
                    qrCodes: generatedQRs.map(qr => qr._id)
                },
                { 
                    new: true,
                    populate: {
                        path: 'qrCodes',
                        select: 'qrId qrImage isLinked isActive'
                    }
                }
            );

            return {
                order: updatedOrder,
                qrCodes: updatedOrder.qrCodes
            };
        } catch (error) {
            console.error('Error en createOrder:', error);
            throw error;
        }
    },

    async confirmOrder(orderId) {
        try {
            // Buscar la orden
            const order = await OrderModel.findById(orderId);
            if (!order) {
                throw new Error('Orden no encontrada');
            }

            if (order.status === 'COMPLETED') {
                return {
                    message: 'La orden ya fue completada anteriormente',
                    order
                };
            }

            // Generar QRs si aún no se han generado
            if (!order.qrCodes || order.qrCodes.length === 0) {
                const generatedQRs = await qrData.generateMultipleQRs(order.userId, order.quantity);
                
                // Actualizar los QRs con el orderId
                for (const qr of generatedQRs) {
                    await QRModel.findByIdAndUpdate(qr._id, { orderId: order._id });
                }

                // Actualizar orden con los QRs
                const updatedOrder = await OrderModel.findByIdAndUpdate(
                    order._id,
                    {
                        status: 'COMPLETED',
                        paymentStatus: 'COMPLETED',
                        qrCodes: generatedQRs.map(qr => qr._id)
                    },
                    { 
                        new: true,
                        populate: {
                            path: 'qrCodes',
                            select: 'qrId qrImage isLinked isActive'
                        }
                    }
                );

                return {
                    message: 'Orden confirmada y códigos QR generados',
                    order: updatedOrder,
                    qrCodes: updatedOrder.qrCodes
                };
            }

            return {
                message: 'No se realizó ninguna acción, la orden ya está procesada',
                order
            };
        } catch (error) {
            console.error('Error en confirmOrder:', error);
            throw error;
        }
    },

    async getOrderById(orderId) {
        const order = await OrderModel.findById(orderId)
            .populate('qrCodes', 'qrId qrImage isLinked isActive');
        
        if (!order) {
            throw new Error('Orden no encontrada');
        }

        return order;
    },

    async getUserOrders(userId) {
        return await OrderModel.find({ userId })
            .sort({ createdAt: -1 })
            .populate('qrCodes', 'qrId qrImage isLinked isActive');
    }
};

module.exports = orderData; 