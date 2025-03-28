const OrderModel = require('../models/OrderModel');
const QRModel = require('../models/QRModel');
const UserModel = require('../models/UserModel');
const crypto = require('crypto');
const QRCode = require('qrcode');
const epaycoService = require('../services/epaycoService');

class OrderData {
async createOrder(orderData) {
    const { 
        userId, 
        quantity, 
        shippingDetails, 
        customerName, 
        customerEmail,
        customerLastName,
        docNumber,
        paymentMethod,
        customerId,
        ...paymentData
    } = orderData;
    
    const unitPrice = 15000;
    const totalAmount = quantity * unitPrice;

    try {
        // Crear la orden
        const order = await OrderModel.create({
            userId,
            quantity,
            totalAmount,
            status: 'Pendiente',
            paymentStatus: 'CREATED',
            shippingDetails,
            customerName,
            customerEmail,
            customerLastName,
            docNumber,
            customerId,
            paymentDetails: {
                paymentMethod
            }
        });

        // Generar códigos QR
        const qrCodes = await this.generateQRCodes(order);

        // Procesar pago según el método
        let payment;
        switch(paymentMethod) {
            case 'credit_card':
                payment = await epaycoService.createPayment({
                    ...order.toObject(),
                    tokenCard: paymentData.tokenCard,
                    customerName,
                    customerEmail,
                    customerLastName,
                    docNumber
                });
                break;

            case 'pse':
                payment = await epaycoService.createPSEPayment({
                    ...order.toObject(),
                    bankCode: paymentData.bankCode,
                    typePerson: paymentData.typePerson,
                    docType: paymentData.docType
                });
                break;

            case 'cash':
                payment = await epaycoService.createCashPayment({
                    ...order.toObject(),
                    cashType: paymentData.cashType
                });
                break;
        }

        // Actualizar orden con datos del pago
        order.paymentId = payment.ref_payco;
        order.transactionId = payment.transaction_id;
        await order.save();

        return { 
            order, 
            qrCodes, 
            transaction: {
                ref_payco: payment.ref_payco,
                transaction_id: payment.transaction_id,
                status: payment.status,
                url: payment.url,
                ...(payment.pin && { pin: payment.pin }) // Solo para pagos en efectivo
            }
        };
    } catch (error) {
        console.error('Error al crear orden:', error);
        throw new Error(`Error al crear orden: ${error.message}`);
    }
}

    async generateQRCodes(order) {
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
        return qrCodes;
    }

    async confirmPayment(paymentData) {
        try {
            const order = await OrderModel.findById(paymentData.x_id_invoice);
            if (!order) throw new Error('Orden no encontrada');

            const transactionStatus = await epaycoService.getTransactionStatus(paymentData.x_ref_payco);
            
            // Actualizar estado usando el método estático
            const updatedOrder = await OrderModel.updatePaymentStatus(order._id, {
                status: transactionStatus.data.status,
                message: transactionStatus.data.message,
                transactionDate: new Date(transactionStatus.data.transaction_date),
                authorizationCode: transactionStatus.data.authorization_code,
                errorCode: transactionStatus.data.error_code,
                responseCode: transactionStatus.data.response_code,
                responseMessage: transactionStatus.data.response_message,
                reason: transactionStatus.data.reason
               
            });

            return updatedOrder;
        } catch (error) {
            console.error('Error al confirmar pago:', error);
            throw new Error(`Error al confirmar pago: ${error.message}`);
        }
    }

    async getOrderById(orderId) {
        return await OrderModel.findById(orderId);
    }

    async getUserOrders(userId) {
        return await OrderModel.find({ userId }).sort({ createdAt: -1 });
    }
}

module.exports = new OrderData();