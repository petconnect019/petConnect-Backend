const OrderModel = require('../models/OrderModel');
const QRModel = require('../models/QRModel');
const qrData = require('./qrData');

const validateOrderData = (orderInfo) => {
    // Validar datos requeridos
    const requiredFields = ['quantity', 'customer', 'shipping'];
    const missingFields = requiredFields.filter(field => !orderInfo[field]);
    if (missingFields.length) {
        throw new Error(`Campos requeridos faltantes: ${missingFields.join(', ')}`);
    }

    // Validar datos del cliente
    const customerFields = ['name', 'email', 'phone'];
    const missingCustomerFields = customerFields.filter(field => !orderInfo.customer[field]);
    if (missingCustomerFields.length) {
        throw new Error(`Campos del cliente faltantes: ${missingCustomerFields.join(', ')}`);
    }

    // Validar email
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailRegex.test(orderInfo.customer.email)) {
        throw new Error('Email inválido');
    }

    // Validar teléfono
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(orderInfo.customer.phone)) {
        throw new Error('Teléfono inválido (debe tener 10 dígitos)');
    }

    // Validar cantidad
    if (orderInfo.quantity < 1 || orderInfo.quantity > 10) {
        throw new Error('Cantidad inválida (debe estar entre 1 y 10)');
    }
};

const orderData = {
    createOrder: async function(orderInfo) {
        try {
            // Validar los datos de la orden
            validateOrderData(orderInfo);

            const unitPrice = 15000; // Precio unitario en COP
            const totalAmount = orderInfo.quantity * unitPrice;

            // Reestructurar los datos según el modelo
            const orderToCreate = {
                userId: orderInfo.userId,
                quantity: orderInfo.quantity,
                totalAmount: totalAmount,
                status: 'pending',
                paymentStatus: 'PENDING',
                customerName: orderInfo.customer.name,
                customerEmail: orderInfo.customer.email,
                customerPhone: orderInfo.customer.phone,
                shippingDetails: {
                    address: orderInfo.shipping.address,
                    city: orderInfo.shipping.city,
                    state: orderInfo.shipping.state,
                    country: orderInfo.shipping.country,
                    postalCode: orderInfo.shipping.postalCode
                }
            };

            const order = new OrderModel(orderToCreate);
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

    // Actualizar el pago de una orden
    updateOrderPayment: async (orderId, paymentInfo) => {
        try {
            console.log(`Actualizando pago para orden ${orderId} con datos:`, JSON.stringify(paymentInfo, null, 2));
            
            const updateData = {};
            
            // Actualizar solo los campos proporcionados
            if (paymentInfo.paymentStatus) {
                updateData.paymentStatus = paymentInfo.paymentStatus;
            }
            
            if (paymentInfo.epaycoRef) {
                console.log(`Actualizando epaycoRef a: ${paymentInfo.epaycoRef}`);
                updateData.epaycoRef = paymentInfo.epaycoRef;
            }
            
            if (paymentInfo.paymentData) {
                updateData.paymentData = paymentInfo.paymentData;
            }
            
            console.log(`Datos finales de actualización:`, JSON.stringify(updateData, null, 2));
            
            const updatedOrder = await OrderModel.findByIdAndUpdate(
                orderId, 
                { $set: updateData },
                { new: true }
            );
            
            if (updatedOrder) {
                console.log(`Orden ${orderId} actualizada correctamente con epaycoRef: ${updatedOrder.epaycoRef}`);
            } else {
                console.log(`No se encontró la orden ${orderId} para actualizar`);
            }
            
            return updatedOrder;
        } catch (error) {
            console.error('Error al actualizar pago de orden:', error);
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
    },

    validatePaymentData: function(paymentData) {
        if (!paymentData?.token) {
            throw new Error('Token de pago es requerido');
        }
    },

    validateOrderAccess: function(order, userId) {
        if (order.userId.toString() !== userId) {
            throw new Error('No tienes permiso para acceder a esta orden');
        }
    },

    validateOrderStatus: function(order) {
        if (order.status !== 'pending') {
            throw new Error('La orden ya ha sido procesada');
        }
    }
};

module.exports = orderData; 