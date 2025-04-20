const Epayco = require('epayco-sdk-node');
const crypto = require("crypto");
const epayco = require('../config/epayco.config');

class EpaycoService {
    constructor() {
        try {
            if (!process.env.EPAYCO_PUBLIC_KEY || !process.env.EPAYCO_PRIVATE_KEY) {
                throw new Error('Las claves de ePayco no están configuradas');
            }

            this.epayco = new Epayco({
                apiKey: process.env.EPAYCO_PUBLIC_KEY,
                privateKey: process.env.EPAYCO_PRIVATE_KEY,
                lang: "ES",
                test: process.env.NODE_ENV !== 'production',
                p_cust_id_cliente: process.env.EPAYCO_CUST_ID_CLIENTE,
                p_key: process.env.EPAYCO_P_KEY
            });

            if (!this.epayco) {
                throw new Error('No se pudo crear el cliente ePayco');
            }
        } catch (error) {
            console.error('Error en el constructor de EpaycoService:', error);
            throw error;
        }
    }

    async processPayment(orderData, paymentMethod) {
        try {
            console.log('Procesando pago con método:', paymentMethod);
            console.log('Datos de pago recibidos:', JSON.stringify(orderData.paymentData));

            let paymentResult;
            
            switch(paymentMethod) {
                case 'credit_card':
                    if (!orderData.paymentData) {
                        throw new Error('No se proporcionaron datos de pago');
                    }
                    const { number, expYear, expMonth, cvc } = orderData.paymentData;
                    if (!number || !expYear || !expMonth || !cvc) {
                        throw new Error(`Datos de tarjeta incompletos: ${JSON.stringify({
                            hasNumber: !!number,
                            hasExpYear: !!expYear,
                            hasExpMonth: !!expMonth,
                            hasCvc: !!cvc
                        })}`);
                    }
                    paymentResult = await this.processCreditCardPayment(orderData);
                    break;

                case 'pse':
                    if (!orderData.paymentData?.bankCode) {
                        throw new Error('Código de banco requerido para PSE');
                    }
                    paymentResult = await this.processPSEPayment(orderData);
                    break;

                case 'cash':
                    if (!orderData.paymentData?.cashType) {
                        throw new Error('Tipo de pago en efectivo requerido');
                    }
                    paymentResult = await this.processCashPayment(orderData);
                    break;

                default:
                    throw new Error(`Método de pago no soportado: ${paymentMethod}`);
            }

            console.log('Resultado del procesamiento:', JSON.stringify(paymentResult));
            return {
                success: true,
                data: paymentResult
            };
        } catch (error) {
            console.error('Error en processPayment:', error);
            return {
                success: false,
                error: error.message,
                details: error.stack
            };
        }
    }

    async createToken(cardInfo) {
        try {
            console.log('Creando token para tarjeta:', JSON.stringify({
                hasNumber: !!cardInfo.number,
                hasExpYear: !!cardInfo.expYear,
                hasExpMonth: !!cardInfo.expMonth,
                hasCvc: !!cardInfo.cvc
            }));

            const credit_info = {
                "card[number]": cardInfo.number.toString().replace(/\s/g, ''),
                "card[exp_year]": cardInfo.expYear.toString(),
                "card[exp_month]": cardInfo.expMonth.toString().padStart(2, '0'),
                "card[cvc]": cardInfo.cvc.toString()
            };

            const token = await this.epayco.token.create(credit_info);
            
            if (!token?.data?.id) {
                throw new Error('No se pudo generar el token de la tarjeta');
            }

            return token.data.id;
        } catch (error) {
            console.error('Error al crear token:', error);
            throw new Error(`Error al crear token: ${error.message}`);
        }
    }

    async createCustomer(customerInfo, tokenCard) {
        try {
            const customer_data = {
                token_card: tokenCard,
                name: customerInfo.customerName,
                last_name: customerInfo.customerLastName,
                email: customerInfo.customerEmail,
                default: true,
                city: customerInfo.shippingDetails?.city || "Bogota",
                address: customerInfo.shippingDetails?.address,
                phone: customerInfo.shippingDetails?.phone,
                cell_phone: customerInfo.shippingDetails?.cellPhone,
                doc_type: "CC",
                doc_number: customerInfo.docNumber
            };

            const customer = await this.epayco.customers.create(customer_data);
            
            if (!customer?.data?.customerId) {
                throw new Error('Error al crear cliente en ePayco');
            }

            return customer.data.customerId;
        } catch (error) {
            throw new Error(`Error al crear cliente: ${error.message}`);
        }
    }

    async processCreditCardPayment(orderData) {
        try {
            const tokenCard = await this.createToken(orderData.paymentData);
            const customerId = await this.createCustomer(orderData, tokenCard);

            const payment = await this.epayco.charge.create({
                token_card: tokenCard,
                customer_id: customerId,
                doc_type: "CC",
                doc_number: orderData.docNumber,
                name: orderData.customerName,
                last_name: orderData.customerLastName,
                email: orderData.customerEmail,
                bill: orderData._id.toString(),
                description: `Pago por ${orderData.quantity} código(s) QR`,
                value: String(orderData.totalAmount),
                tax: "0",
                tax_base: String(orderData.totalAmount),
                currency: "COP",
                url_response: `${process.env.FRONTEND_URL}/payment/response`,
                url_confirmation: `${process.env.BASE_URL}/api/orders/confirmation`
            });

            return this.formatPaymentResponse(payment);
        } catch (error) {
            throw new Error(`Error en el pago con tarjeta: ${error.message}`);
        }
    }

    async processPSEPayment(orderData) {
        const payment = await this.epayco.bank.create({
            bank: orderData.paymentData.bankCode,
            type_person: orderData.typePerson || "0",
            doc_type: orderData.docType || "CC",
            doc_number: orderData.docNumber,
            name: orderData.customerName,
            last_name: orderData.customerLastName,
            email: orderData.customerEmail,
            bill: orderData._id.toString(),
            description: `Pago PSE por ${orderData.quantity} código(s) QR`,
            value: String(orderData.totalAmount),
            tax: "0",
            tax_base: String(orderData.totalAmount),
            currency: "COP",
            url_response: `${process.env.FRONTEND_URL}/payment/response`,
            url_confirmation: `${process.env.BASE_URL}/api/orders/confirmation`
        });

        return this.formatPaymentResponse(payment);
    }

    async processCashPayment(orderData) {
        const payment = await this.epayco.cash.create({
            type: orderData.paymentData.cashType,
            invoice: orderData._id.toString(),
            description: `Pago en efectivo por ${orderData.quantity} código(s) QR`,
            value: String(orderData.totalAmount),
            tax: "0",
            tax_base: String(orderData.totalAmount),
            currency: "COP",
            name: orderData.customerName,
            last_name: orderData.customerLastName,
            email: orderData.customerEmail,
            cell_phone: orderData.shippingDetails?.cellPhone,
            end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            url_response: `${process.env.FRONTEND_URL}/payment/response`,
            url_confirmation: `${process.env.BASE_URL}/api/orders/confirmation`
        });

        return this.formatPaymentResponse(payment);
    }

    validateSignature(data) {
        try {
            const signature = `${data.x_cust_id_cliente}^${process.env.EPAYCO_P_KEY}^${data.x_ref_payco}^${data.x_transaction_id}^${data.x_amount}^${data.x_currency_code}`;
            const hash = crypto.createHash("sha256").update(signature).digest("hex");
            return hash === data.x_signature;
        } catch (error) {
            console.error('Error en validateSignature:', error);
            return false;
        }
    }

    formatPaymentResponse(payment) {
        if (!payment?.data) {
            throw new Error('Respuesta de pago inválida');
        }

        return {
            ref_payco: payment.data.ref_payco,
            transaction_id: payment.data.recibo || payment.data.requestId,
            status: payment.data.estado || 'PENDING',
            url: payment.data.urlpago || payment.data.urlbanco || payment.data.urlrecibo,
            checkout_url: `https://secure.epayco.co/validation/v1/reference/${payment.data.ref_payco}`
        };
    }

    async getTransactionStatus(ref_payco) {
        try {
            const transaction = await this.epayco.charge.get(ref_payco);
            
            if (!transaction?.data) {
                throw new Error('Error al obtener estado de transacción');
            }

            return {
                status: transaction.data.status,
                date: transaction.data.transaction_date,
                reference: transaction.data.ref_payco,
                description: transaction.data.description,
                currency: transaction.data.currency,
                value: transaction.data.value
            };
        } catch (error) {
            throw new Error(`Error al obtener estado: ${error.message}`);
        }
    }

    static async createPayment(paymentData) {
        try {
            const payment = await epayco.charge.create(paymentData);
            return payment;
        } catch (error) {
            console.error('Error en EpaycoService.createPayment:', error);
            throw error;
        }
    }

    static async getPaymentInfo(refPayco) {
        try {
            const paymentInfo = await epayco.charge.get(refPayco);
            return paymentInfo;
        } catch (error) {
            console.error('Error en EpaycoService.getPaymentInfo:', error);
            throw error;
        }
    }

    static async createToken(cardData) {
        try {
            const token = await epayco.token.create(cardData);
            return token;
        } catch (error) {
            console.error('Error en EpaycoService.createToken:', error);
            throw error;
        }
    }

    static async createCustomer(customerData) {
        try {
            const customer = await epayco.customers.create(customerData);
            return customer;
        } catch (error) {
            console.error('Error en EpaycoService.createCustomer:', error);
            throw error;
        }
    }

    /**
     * Verificar el estado de un pago
     * @param {string} paymentId - ID del pago a verificar
     */
    async verifyPayment(paymentId) {
        try {
            const payment = await this.epayco.charge.get(paymentId);
            return payment;
        } catch (error) {
            console.error('Error al verificar pago:', error);
            throw new Error(`Error al verificar el pago: ${error.message}`);
        }
    }
}

module.exports = new EpaycoService();
