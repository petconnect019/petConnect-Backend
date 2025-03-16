const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Servicio para manejar operaciones con Stripe
 */
const stripeService = {
    /**
     * Crear un intent de pago
     * @param {number} amount - Cantidad a cobrar (en centavos)
     * @param {string} currency - Moneda (por defecto USD)
     * @param {Object} metadata - Metadatos adicionales
     * @param {Object} customerInfo - Información del cliente (nombre, email)
     */
    createPaymentIntent: async (amount, currency = 'usd', metadata = {}, customerInfo = {}) => {
        try {
            // Crear objeto de datos para el PaymentIntent
            const paymentIntentData = {
                amount,
                currency,
                metadata,
                automatic_payment_methods: {
                    enabled: true,
                }
            };
            
            // Si hay información del cliente, añadirla
            if (customerInfo.name || customerInfo.email) {
                paymentIntentData.receipt_email = customerInfo.email;
                
                // Añadir información de facturación si hay un nombre
                if (customerInfo.name) {
                    paymentIntentData.description = `Compra de collar con QRs para ${customerInfo.name}`;
                    
                    // Añadir información del cliente para que aparezca en el dashboard de Stripe
                    paymentIntentData.shipping = {
                        name: customerInfo.name,
                        address: customerInfo.address || {
                            line1: 'No especificada',
                            city: customerInfo.city || 'No especificada',
                            country: 'CO',
                        }
                    };
                }
            }
            
            const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);
            
            return {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id
            };
        } catch (error) {
            console.error('Error al crear payment intent:', error);
            switch (error.type) {
                case 'StripeCardError':
                    throw new Error(`Error de tarjeta: ${error.message}`);
                case 'StripeInvalidRequestError':
                    throw new Error(`Solicitud inválida: ${error.message}`);
                case 'StripeAuthenticationError':
                    throw new Error(`Error de autenticación con Stripe: Verifica tu API key`);
                case 'StripeRateLimitError':
                    throw new Error(`Demasiadas solicitudes a Stripe: Intenta más tarde`);
                case 'StripeConnectionError':
                    throw new Error(`Error de conexión con Stripe: Verifica tu conexión a internet`);
                case 'StripeAPIError':
                    throw new Error(`Error de API de Stripe: ${error.message}`);
                default:
                    throw new Error(`Error al crear payment intent: ${error.message}`);
            }
        }
    },
    
    /**
     * Confirmar un pago
     * @param {string} paymentIntentId - ID del payment intent
     * @param {boolean} forceConfirm - Forzar confirmación para pruebas (solo en desarrollo)
     */
    confirmPayment: async (paymentIntentId, forceConfirm = false) => {
        try {
            // Restringir forceConfirm solo a entornos de desarrollo
            if (process.env.NODE_ENV === 'production') {
                forceConfirm = false;
            }
            
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            
            // Si forceConfirm es true, ignoramos la verificación del estado
            if (!forceConfirm && paymentIntent.status !== 'succeeded') {
                throw new Error(`El pago no ha sido completado. Estado: ${paymentIntent.status}`);
            }
            
            return {
                status: forceConfirm ? 'succeeded' : paymentIntent.status,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                paymentMethod: paymentIntent.payment_method
            };
        } catch (error) {
            console.error('Error al confirmar pago:', error);
            
            if (error.type === 'StripeInvalidRequestError') {
                throw new Error(`PaymentIntent no encontrado o inválido: ${error.message}`);
            } else if (error.type === 'StripeAuthenticationError') {
                throw new Error(`Error de autenticación con Stripe: Verifica tu API key`);
            } else {
                throw new Error(`Error al confirmar pago: ${error.message}`);
            }
        }
    },
    
    /**
     * Crear un producto en Stripe
     * @param {string} name - Nombre del producto
     * @param {string} description - Descripción del producto
     */
    createProduct: async (name, description) => {
        try {
            const product = await stripe.products.create({
                name,
                description
            });
            
            return product;
        } catch (error) {
            console.error('Error al crear producto:', error);
            
            if (error.type === 'StripeInvalidRequestError') {
                throw new Error(`Error al crear producto: ${error.message}`);
            } else if (error.type === 'StripeAuthenticationError') {
                throw new Error(`Error de autenticación con Stripe: Verifica tu API key`);
            } else {
                throw new Error(`Error al crear producto: ${error.message}`);
            }
        }
    },
    
    /**
     * Crear un precio para un producto
     * @param {string} productId - ID del producto
     * @param {number} unitAmount - Precio unitario (en centavos)
     * @param {string} currency - Moneda (por defecto USD)
     */
    createPrice: async (productId, unitAmount, currency = 'usd') => {
        try {
            const price = await stripe.prices.create({
                product: productId,
                unit_amount: unitAmount,
                currency
            });
            
            return price;
        } catch (error) {
            console.error('Error al crear precio:', error);
            
            if (error.type === 'StripeInvalidRequestError') {
                throw new Error(`Error al crear precio: ${error.message}`);
            } else if (error.type === 'StripeAuthenticationError') {
                throw new Error(`Error de autenticación con Stripe: Verifica tu API key`);
            } else {
                throw new Error(`Error al crear precio: ${error.message}`);
            }
        }
    },
    
    /**
     * Crear un webhook para recibir eventos de Stripe
     * @param {Object} event - Evento recibido de Stripe
     */
    handleWebhookEvent: async (event) => {
        try {
            switch (event.type) {
                case 'payment_intent.succeeded':
                    const paymentIntent = event.data.object;
                    console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
                    const customerId = paymentIntent.customer; // Obtener el ID del cliente
                    const orderId = paymentIntent.metadata.order_id; // Suponiendo que el ID del pedido se almacena en los metadatos del PaymentIntent
                    
                    if (orderId) {
                        const OrderModel = require('../models/OrderModel');
                        await OrderModel.updateOne({ _id: orderId }, { status: 'pagado' }); // Actualiza el estado del pedido a 'pagado'
                        console.log(`Actualizando el estado del pedido ${orderId} para el cliente ${customerId}`);
                    } else {
                        console.warn('No se encontró order_id en los metadatos del PaymentIntent');
                    }
                    
                    return { success: true, paymentIntent };
                    
                case 'payment_intent.payment_failed':
                    const failedPayment = event.data.object;
                    console.log(`Payment failed: ${failedPayment.last_payment_error?.message}`);
                    return { success: false, error: failedPayment.last_payment_error };
                    
                default:
                    console.log(`Unhandled event type ${event.type}`);
                    return { success: true, message: `Unhandled event type ${event.type}` };
            }
        } catch (error) {
            console.error('Error al procesar webhook:', error);
            throw new Error(`Error al procesar webhook: ${error.message}`);
        }
    }
};

module.exports = stripeService; 