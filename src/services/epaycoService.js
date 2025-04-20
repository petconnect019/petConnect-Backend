const Epayco = require('epayco-sdk-node')({
    apiKey: process.env.EPAYCO_PUBLIC_KEY,
    privateKey: process.env.EPAYCO_PRIVATE_KEY,
    lang: 'ES',
    test: process.env.EPAYCO_TEST === 'true'
});

class EpaycoService {
    static async createPayment(orderInfo) {
        try {
            const paymentInfo = {
                token_card: orderInfo.paymentData.token,
                customer_id: process.env.EPAYCO_CUST_ID_CLIENTE,
                doc_type: orderInfo.docType || 'CC',
                doc_number: orderInfo.docNumber,
                name: orderInfo.customerName,
                last_name: orderInfo.customerLastName,
                email: orderInfo.customerEmail,
                city: orderInfo.shippingDetails.city,
                address: orderInfo.shippingDetails.address,
                phone: orderInfo.shippingDetails.phone,
                cell_phone: orderInfo.shippingDetails.cellPhone,
                bill: orderInfo.orderId,
                description: `Compra de ${orderInfo.quantity} códigos QR`,
                value: orderInfo.totalAmount,
                tax: 0,
                tax_base: orderInfo.totalAmount,
                currency: 'COP',
                dues: 1,
                ip: orderInfo.ip || '127.0.0.1',
                url_response: `${process.env.FRONTEND_URL}/payment/response`,
                url_confirmation: `${process.env.BACKEND_URL}/api/payments/confirmation`,
                method_confirmation: 'POST',
                use_default_card_customer: false,
                extras: {
                    extra1: orderInfo.orderId,
                    extra2: orderInfo.userId
                }
            };

            const payment = await Epayco.charge.create(paymentInfo);
            return payment;
        } catch (error) {
            console.error('Error al crear pago con ePayco:', error);
            throw error;
        }
    }

    static async getPaymentInfo(paymentId) {
        try {
            const payment = await Epayco.charge.get(paymentId);
            return payment;
        } catch (error) {
            console.error('Error al obtener información del pago:', error);
            throw error;
        }
    }
}

module.exports = EpaycoService; 