const OrderModel = require('../models/OrderModel');
const epaycoService = require('../services/epaycoService');
const QRModel = require('../models/QRModel');
const qrData = require('./qrData');

const orderData = {
    async createOrder(orderInfo, userId) {
        try {
            const { quantity, shippingDetails, customerName, customerEmail, customerLastName, docNumber, paymentMethod, paymentData } = orderInfo;

            // Validar datos básicos
            if (!quantity || quantity < 1) {
                throw new Error('La cantidad debe ser mayor a 0');
            }

            if (!paymentMethod) {
                throw new Error('Método de pago requerido');
            }

            if (!paymentData) {
                throw new Error('Datos de pago requeridos');
            }

            const unitPrice = 15000;
            const totalAmount = quantity * unitPrice;

            // Crear orden inicial
            const order = await OrderModel.create({
                userId,
                quantity,
                totalAmount,
                status: 'CREATED',
                paymentStatus: 'PENDING',
                shippingDetails,
                customerName,
                customerEmail,
                customerLastName,
                docNumber,
                customerId: 'PENDING',
                paymentDetails: {
                    paymentMethod
                }
            });

            // Procesar el pago
            const paymentResult = await epaycoService.processPayment({
                ...order.toObject(),
                paymentData
            }, paymentMethod);

            if (!paymentResult.success) {
                await OrderModel.findByIdAndUpdate(order._id, {
                    status: 'FAILED',
                    paymentStatus: 'FAILED',
                    'paymentResponse.error': paymentResult.error
                });

                throw new Error(paymentResult.error);
            }

            // Generar QRs si el pago es aceptado
            let generatedQRs = [];
            if (paymentResult.data.status === 'Aceptada') {
                generatedQRs = await qrData.generateMultipleQRs(userId, quantity);
                
                // Actualizar los QRs con el orderId
                for (const qr of generatedQRs) {
                    await QRModel.findByIdAndUpdate(qr._id, { orderId: order._id });
                }
            }

            // Actualizar orden con información del pago y QRs
            const updateData = {
                paymentId: paymentResult.data.ref_payco,
                transactionId: paymentResult.data.transaction_id,
                status: paymentResult.data.status === 'Aceptada' ? 'ACCEPTED' : 'PENDING',
                paymentStatus: paymentResult.data.status === 'Aceptada' ? 'COMPLETED' : 'PROCESSING'
            };

            if (generatedQRs.length > 0) {
                updateData.qrCodes = generatedQRs.map(qr => qr._id);
            }

            const updatedOrder = await OrderModel.findByIdAndUpdate(
                order._id,
                updateData,
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
                payment: paymentResult.data
            };
        } catch (error) {
            throw error;
        }
    },

    async confirmPayment(confirmationData) {
        const { 
            x_ref_payco, 
            x_transaction_state, 
            x_amount, 
            x_currency_code,
            x_test_request,
            x_response,
            x_approval_code,
            x_transaction_date
        } = confirmationData;

        // Buscar la orden
        const order = await OrderModel.findOne({ paymentId: x_ref_payco });
        if (!order) {
            throw new Error('Orden no encontrada');
        }

        // Validar monto y moneda
        if (parseFloat(x_amount) !== order.totalAmount || x_currency_code !== 'COP') {
            throw new Error('Datos de transacción inválidos');
        }

        // Generar QRs si es necesario
        let generatedQRs = [];
        if (x_transaction_state === 'Aceptada' && (!order.qrCodes || order.qrCodes.length === 0)) {
            generatedQRs = await qrData.generateMultipleQRs(order.userId, order.quantity);
            
            // Actualizar los QRs con el orderId
            for (const qr of generatedQRs) {
                await QRModel.findByIdAndUpdate(qr._id, { orderId: order._id });
            }
        }

        // Actualizar la orden
        const updateData = {
            status: x_transaction_state === 'Aceptada' ? 'ACCEPTED' : 'REJECTED',
            paymentStatus: x_transaction_state === 'Aceptada' ? 'COMPLETED' : 'FAILED',
            'paymentResponse.status': x_transaction_state,
            'paymentResponse.date': new Date(),
            'paymentResponse.transactionDate': new Date(x_transaction_date),
            'paymentResponse.authorizationCode': x_approval_code,
            'paymentResponse.responseMessage': x_response,
            'paymentResponse.testRequest': x_test_request === 'TRUE'
        };

        if (generatedQRs.length > 0) {
            updateData.qrCodes = generatedQRs.map(qr => qr._id);
        }

        const updatedOrder = await OrderModel.findByIdAndUpdate(
            order._id,
            updateData,
            { 
                new: true,
                populate: { 
                    path: 'qrCodes',
                    select: 'qrId qrImage isLinked isActive'
                }
            }
        );

        return {
            message: x_transaction_state === 'Aceptada' ? 
                'Pago confirmado y códigos QR generados' : 
                'Pago ' + x_transaction_state.toLowerCase(),
            order: updatedOrder,
            qrCodes: updatedOrder.qrCodes
        };
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