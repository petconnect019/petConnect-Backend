const Epayco = require('epayco-sdk-node');
const crypto = require("crypto");

class EpaycoService {
    constructor() {
        try {
            // Verificar que las variables de entorno estén definidas
            if (!process.env.EPAYCO_PUBLIC_KEY || !process.env.EPAYCO_PRIVATE_KEY) {
                throw new Error('Las claves de ePayco no están configuradas en las variables de entorno');
            }

            // Inicialización del cliente ePayco
            this.epayco = Epayco({
                apiKey: process.env.EPAYCO_PUBLIC_KEY,
                privateKey: process.env.EPAYCO_PRIVATE_KEY,
                lang: "ES",
                test: true
            });

            // Verificación de la inicialización
            if (!this.epayco) {
                throw new Error('No se pudo crear el cliente ePayco');
            }

            console.log('Cliente ePayco inicializado correctamente con las claves:', {
                publicKey: process.env.EPAYCO_PUBLIC_KEY.substring(0, 8) + '...',
                privateKey: process.env.EPAYCO_PRIVATE_KEY.substring(0, 8) + '...'
            });
        } catch (error) {
            console.error('Error en el constructor de EpaycoService:', error);
            throw error;
        }
    }

    async createToken(cardInfo) {
        try {
            if (!this.epayco) {
                throw new Error('Cliente ePayco no inicializado');
            }

            const credit_info = {
                "card[number]": cardInfo.number,
                "card[exp_year]": cardInfo.expYear,
                "card[exp_month]": cardInfo.expMonth,
                "card[cvc]": cardInfo.cvc,
                "hasCvv": true
            };

            console.log('Creando token con datos:', {
                number: cardInfo.number.substring(0, 4) + '...',
                expYear: cardInfo.expYear,
                expMonth: cardInfo.expMonth
            });

            const token = await this.epayco.token.create(credit_info);
            
            if (!token || !token.data || !token.data.id) {
                console.error('Respuesta inválida al crear token:', token);
                throw new Error('Respuesta inválida al crear token');
            }

            return token.data.id;
        } catch (error) {
            console.error('Error al crear token:', error);
            throw new Error(`Error al crear token: ${error.message}`);
        }
    }

    async createCustomer(customerInfo, tokenCard) {
        try {
            if (!this.epayco) {
                throw new Error('Cliente ePayco no inicializado');
            }

            // Validar y formatear la IP
            const defaultIp = "127.0.0.1";
            const ip = customerInfo.ip || defaultIp;
            
            // Validar formato de IP
            const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
            if (!ipRegex.test(ip)) {
                console.warn(`IP inválida proporcionada: ${ip}, usando IP por defecto: ${defaultIp}`);
            }

            const customer_data = {
                token_card: tokenCard,
                name: customerInfo.name,
                last_name: customerInfo.lastName,
                email: customerInfo.email,
                default: true,
                country: "CO",
                city: customerInfo.city || "Bogota",
                address: customerInfo.address || "Cr 123 # 56 78",
                phone: customerInfo.phone || "3180000000",
                doc_type: "CC",
                doc_number: customerInfo.docNumber || "10358519",
                ip: ip
            };

            console.log('Creando cliente con datos:', {
                name: customerInfo.name,
                email: customerInfo.email,
                tokenCard: tokenCard.substring(0, 8) + '...',
                ip: ip
            });

            const customer = await this.epayco.customers.create(customer_data);
            
            if (!customer) {
                console.error('Respuesta vacía al crear cliente');
                throw new Error('Respuesta vacía al crear cliente');
            }

            // Verificar la estructura de la respuesta
            if (customer.success && customer.data && customer.data.customerId) {
                console.log('Cliente creado exitosamente:', {
                    customerId: customer.data.customerId,
                    email: customer.data.email,
                    status: customer.data.status
                });
                return customer.data.customerId;
            }

            console.error('Respuesta inválida al crear cliente:', customer);
            throw new Error(customer.data?.description || 'Error al crear cliente en ePayco');
        } catch (error) {
            console.error('Error al crear cliente:', error);
            if (error.response) {
                console.error('Detalles del error de ePayco:', error.response.data);
                throw new Error(`Error de ePayco: ${error.response.data.message || error.message}`);
            }
            throw new Error(`Error al crear cliente: ${error.message}`);
        }
    }

    async createPayment(orderData) {
        try {
            if (!this.epayco) {
                throw new Error('Cliente ePayco no inicializado');
            }

            console.log('Creando pago con datos:', {
                amount: orderData.totalAmount,
                invoice: orderData._id.toString(),
                name_billing: orderData.customerName
            });

            const paymentData = {
                token_card: orderData.tokenCard,
                customer_id: orderData.customerId,
                doc_type: "CC",
                doc_number: orderData.docNumber || "10358519",
                name: orderData.customerName,
                last_name: orderData.customerLastName || "Doe",
                email: orderData.customerEmail,
                city: orderData.shippingDetails?.city || "Bogota",
                address: orderData.shippingDetails?.address || "Cr 4 # 55 36",
                phone: orderData.shippingDetails?.phone || "3005234321",
                cell_phone: orderData.shippingDetails?.cellPhone || "3010000001",
                bill: orderData._id.toString(),
                description: `Pago por ${orderData.quantity} código(s) QR`,
                value: String(orderData.totalAmount),
                tax: "0",
                tax_base: String(orderData.totalAmount),
                currency: "COP",
                ip: orderData.ip || "127.0.0.1",
                url_response: `${process.env.FRONTEND_URL}/pago-exitoso`,
                url_confirmation: `${process.env.BASE_URL}/api/orders/epayco/confirmation`,
                method_confirmation: "POST",
                extra1: orderData.userId.toString(),
                extra2: orderData.quantity.toString()
            };

            const payment = await this.epayco.charge.create(paymentData);
            
            if (!payment) {
                console.error('Respuesta de ePayco vacía');
                throw new Error('Respuesta inválida de ePayco');
            }

            // Verificar la estructura de la respuesta
            if (payment.success && payment.data) {
                console.log('Pago creado exitosamente:', {
                    ref_payco: payment.data.ref_payco,
                    factura: payment.data.factura,
                    estado: payment.data.estado
                });
                return {
                    ref_payco: payment.data.ref_payco,
                    transaction_id: payment.data.recibo,
                    status: payment.data.estado,
                    url: payment.data.urlpago
                };
            }

            console.error('Respuesta inválida de ePayco:', payment);
            throw new Error(payment.data?.description || 'Error al procesar el pago en ePayco');
        } catch (error) {
            console.error('Error detallado en createPayment:', error);
            if (error.response) {
                console.error('Detalles del error de ePayco:', error.response.data);
                throw new Error(`Error de ePayco: ${error.response.data.message || error.message}`);
            }
            throw new Error(`Error al crear el pago: ${error.message}`);
        }
    }

    validateSignature(data) {
        try {
            if (!data.x_signature || !data.x_cust_id_cliente || !data.x_ref_payco || 
                !data.x_transaction_id || !data.x_amount || !data.x_currency_code) {
                console.log('Datos de firma incompletos:', data);
                return false;
            }

            const signature = `${data.x_cust_id_cliente}^${process.env.EPAYCO_PRIVATE_KEY}^${data.x_ref_payco}^${data.x_transaction_id}^${data.x_amount}^${data.x_currency_code}`;
            const hash = crypto.createHash("sha256").update(signature).digest("hex");
            
            console.log('Validación de firma:', {
                calculada: hash,
                recibida: data.x_signature,
                coinciden: hash === data.x_signature
            });

            return hash === data.x_signature;
        } catch (error) {
            console.error('Error en validateSignature:', error);
            return false;
        }
    }

    async getTransactionStatus(refPayco) {
        try {
            if (!this.epayco) {
                throw new Error('Cliente ePayco no inicializado');
            }

            console.log('Consultando estado de transacción:', refPayco);
            const transaction = await this.epayco.charge.get(refPayco);
            
            if (!transaction || !transaction.data) {
                console.error('Respuesta de estado vacía:', transaction);
                throw new Error('Respuesta inválida al consultar estado');
            }

            return transaction.data;
        } catch (error) {
            console.error('Error en getTransactionStatus:', error);
            if (error.response) {
                console.error('Detalles del error de ePayco:', error.response.data);
                throw new Error(`Error de ePayco: ${error.response.data.message || error.message}`);
            }
            throw new Error(`Error al obtener estado de transacción: ${error.message}`);
        }
    }

    async createPSEPayment(orderData) {
        try {
            if (!this.epayco) {
                throw new Error('Cliente ePayco no inicializado');
            }

            console.log('Creando pago PSE con datos:', {
                amount: orderData.totalAmount,
                invoice: orderData._id.toString(),
                bank: orderData.bankCode
            });

            const pseData = {
                bank: orderData.bankCode,
                type_person: orderData.typePerson || "0", // 0: natural, 1: jurídica
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
                ip: orderData.ip || "127.0.0.1",
                url_response: `${process.env.FRONTEND_URL}/pago-exitoso`,
                url_confirmation: `${process.env.BASE_URL}/api/orders/epayco/confirmation`
            };

            const payment = await this.epayco.bank.create(pseData);
            
            if (!payment || !payment.data) {
                throw new Error('Respuesta inválida de ePayco para PSE');
            }

            return {
                ref_payco: payment.data.ref_payco,
                transaction_id: payment.data.requestId,
                status: 'Pendiente',
                url: payment.data.urlbanco
            };
        } catch (error) {
            console.error('Error en createPSEPayment:', error);
            throw new Error(`Error al crear pago PSE: ${error.message}`);
        }
    }

    async createCashPayment(orderData) {
        try {
            if (!this.epayco) {
                throw new Error('Cliente ePayco no inicializado');
            }

            console.log('Creando pago en efectivo con datos:', {
                amount: orderData.totalAmount,
                invoice: orderData._id.toString(),
                type: orderData.cashType
            });

            const cashData = {
                type: orderData.cashType, // efecty, baloto, gana, etc.
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
                end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
                ip: orderData.ip || "127.0.0.1",
                url_response: `${process.env.FRONTEND_URL}/pago-exitoso`,
                url_confirmation: `${process.env.BASE_URL}/api/orders/epayco/confirmation`
            };

            const payment = await this.epayco.cash.create(cashData);

            if (!payment || !payment.data) {
                throw new Error('Respuesta inválida de ePayco para pago en efectivo');
            }

            return {
                ref_payco: payment.data.ref_payco,
                transaction_id: payment.data.requestId,
                status: 'Pendiente',
                url: payment.data.urlrecibo,
                pin: payment.data.pin // Código para pago en efectivo
            };
        } catch (error) {
            console.error('Error en createCashPayment:', error);
            throw new Error(`Error al crear pago en efectivo: ${error.message}`);
        }
    }
}

// Crear la instancia con mejor manejo de errores
let epaycoService;
try {
    epaycoService = new EpaycoService();
    console.log('Servicio ePayco inicializado correctamente');
} catch (error) {
    console.error('Error al inicializar EpaycoService:', error.message);
    console.error('Detalles del error:', error);
    throw error; // Lanzamos el error para que la aplicación no continúe con un servicio no inicializado
}

module.exports = epaycoService;
