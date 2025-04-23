const Epayco = require('epayco-sdk-node')({
    apiKey: process.env.EPAYCO_PUBLIC_KEY,
    privateKey: process.env.EPAYCO_PRIVATE_KEY,
    lang: 'ES',
    test: process.env.EPAYCO_TEST === 'true'
});

class EpaycoService {

    
    static async createPayment(paymentInfo) {
        try {
            console.log('Iniciando proceso de pago con ePayco:', JSON.stringify(paymentInfo, null, 2));

            // Validar datos requeridos
            const requiredFields = ['amount', 'customerEmail', 'customerName', 'token'];
            const missingFields = requiredFields.filter(field => !paymentInfo[field]);
            if (missingFields.length) {
                throw new Error(`Campos requeridos faltantes para el pago: ${missingFields.join(', ')}`);
            }

            // Validar monto
            if (paymentInfo.amount <= 0) {
                throw new Error('El monto debe ser mayor a 0');
            }

            // Validar email
            const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
            if (!emailRegex.test(paymentInfo.customerEmail)) {
                throw new Error('Email inválido');
            }

            // Preparar datos para ePayco
            const paymentData = {
                token_card: paymentInfo.token,
                customer_id: paymentInfo.customerEmail,
                doc_type: 'CC',
                doc_number: paymentInfo.docNumber || '123456789',
                name: paymentInfo.customerName,
                last_name: paymentInfo.customerLastName || ' ',
                email: paymentInfo.customerEmail,
                city: paymentInfo.shippingCity,
                address: paymentInfo.shippingAddress,
                phone: paymentInfo.customerPhone,
                cell_phone: paymentInfo.customerPhone,
                bill: paymentInfo.orderId,
                description: `Orden de ${paymentInfo.quantity} códigos QR`,
                value: paymentInfo.amount,
                tax: '0',
                tax_base: '0',
                currency: 'COP',
                dues: '1',
                ip: paymentInfo.ip || '127.0.0.1'
            };

            console.log('Datos de pago preparados:', JSON.stringify(paymentData, null, 2));

            // Crear el pago
            const payment = await Epayco.charge.create(paymentData);

            console.log('Respuesta de ePayco:', JSON.stringify(payment, null, 2));

            // Verificar el estado del pago
            if (payment.success) {
                return {
                    success: true,
                    paymentId: payment.data.id,
                    status: payment.data.status,
                    message: payment.data.message
                };
            } else {
                throw new Error(payment.data.message || 'Error al procesar el pago');
            }
        } catch (error) {
            console.error('Error en el servicio de ePayco:', error);
            throw new Error(`Error al procesar el pago: ${error.message}`);
        }
    }

    static async getPaymentStatus(paymentId) {
        try {
            console.log('Consultando estado del pago:', paymentId);

            const payment = await Epayco.charge.get(paymentId);

            console.log('Estado del pago:', JSON.stringify(payment, null, 2));

            return {
                success: payment.success,
                status: payment.data.status,
                message: payment.data.message
            };
        } catch (error) {
            console.error('Error al consultar estado del pago:', error);
            throw new Error(`Error al consultar estado del pago: ${error.message}`);
        }
    }

    static async refundPayment(paymentId, reason) {
        try {
            console.log('Iniciando reembolso del pago:', paymentId);

            const refund = await Epayco.charge.reverse(paymentId, reason);

            console.log('Respuesta del reembolso:', JSON.stringify(refund, null, 2));

            return {
                success: refund.success,
                status: refund.data.status,
                message: refund.data.message
            };
        } catch (error) {
            console.error('Error al procesar reembolso:', error);
            throw new Error(`Error al procesar reembolso: ${error.message}`);
        }
    }
}

module.exports = EpaycoService; 