const OrderModel = require('../models/OrderModel');
const QRModel = require('../models/QRModel');
const orderData = require('./orderData');
const EpaycoService = require('../services/epaycoService');

const paymentData = {
    /**
     * Procesa la confirmación de pago recibida de ePayco
     * @param {Object} paymentInfo - Información del pago recibida del webhook
     * @returns {Object} Resultado del procesamiento
     */
    processPaymentConfirmation: async (paymentInfo) => {
        try {
            const { x_ref_payco, x_cod_response, x_response } = paymentInfo;

            // Verificar el estado del pago
            const paymentStatus = await EpaycoService.getPaymentStatus(x_ref_payco);
            
            if (!paymentStatus.success) {
                throw new Error('Pago no encontrado');
            }

            // Obtener el ID de la orden desde los extras
            const orderId = paymentStatus.data.extras?.extra1;
            if (!orderId) {
                throw new Error('ID de orden no encontrado en el pago');
            }

            // Obtener la orden
            const order = await orderData.getOrderById(orderId);
            if (!order) {
                throw new Error('Orden no encontrada');
            }

            // Si el pago es exitoso y la orden está pendiente, confirmarla
            if (paymentStatus.status === 'approved' && order.status === 'pending') {
                const result = await orderData.confirmOrder(orderId);
                
                return {
                    success: true,
                    message: 'Pago confirmado y orden completada',
                    order: result.order,
                    qrCodes: result.qrCodes
                };
            } else {
                return {
                    success: true,
                    message: 'Pago ya procesado anteriormente',
                    order
                };
            }
        } catch (error) {
            console.error('Error al procesar confirmación de pago:', error);
            throw error;
        }
    },

    /**
     * Procesa un pago exitoso
     * @param {string} orderId - ID de la orden
     * @param {Object} paymentInfo - Información del pago
     */
    processSuccessfulPayment: async (orderId, paymentInfo) => {
        try {
            const order = await orderData.getOrderById(orderId);
            if (!order) {
                return { success: false, message: `Orden ${orderId} no encontrada` };
            }

            // Actualizar información de pago
            await orderData.updateOrderPayment(orderId, {
                epaycoRef: paymentInfo.referencia,
                paymentStatus: 'COMPLETED',
                paymentData: {
                    transactionId: paymentInfo.referencia,
                    approvalCode: paymentInfo.approvalCode,
                    amount: paymentInfo.amount,
                    transactionDate: new Date(),
                    responseCode: paymentInfo.response,
                    paymentMethod: paymentInfo.additionalData.x_franchise || 'N/A',
                    last4: paymentInfo.additionalData.x_cardnumber ? paymentInfo.additionalData.x_cardnumber.slice(-4) : 'N/A'
                }
            });

            // Confirmar la orden y generar QRs
            const result = await orderData.confirmOrder(orderId);

            return {
                success: true,
                message: `Orden ${orderId} confirmada exitosamente`,
                order: result.order,
                qrCodes: result.qrCodes
            };
        } catch (error) {
            console.error(`Error al procesar pago exitoso para orden ${orderId}:`, error);
            throw error;
        }
    },

    /**
     * Procesa un pago fallido o cancelado
     * @param {string} orderId - ID de la orden
     * @param {Object} paymentInfo - Información del pago
     */
    processFailedPayment: async (orderId, paymentInfo) => {
        try {
            const order = await orderData.getOrderById(orderId);
            if (!order) {
                return { success: false, message: `Orden ${orderId} no encontrada` };
            }

            // Actualizar información de pago
            await orderData.updateOrderPayment(orderId, {
                epaycoRef: paymentInfo.referencia,
                paymentStatus: 'FAILED',
                paymentData: {
                    transactionId: paymentInfo.referencia,
                    amount: paymentInfo.amount,
                    transactionDate: new Date(),
                    responseCode: paymentInfo.response,
                    paymentMethod: paymentInfo.additionalData.x_franchise || 'N/A',
                    last4: paymentInfo.additionalData.x_cardnumber ? paymentInfo.additionalData.x_cardnumber.slice(-4) : 'N/A'
                }
            });

            // Cancelar la orden
            await orderData.cancelOrder(orderId, order.userId);

            return {
                success: true,
                message: `Orden ${orderId} cancelada debido a pago rechazado/cancelado`,
                status: 'FAILED'
            };
        } catch (error) {
            console.error(`Error al procesar pago fallido para orden ${orderId}:`, error);
            throw error;
        }
    },
    
    /**
     * Prepara los datos para la redirección después del pago
     * @param {string} referencia - Referencia del pago de ePayco
     * @returns {Object} Datos para la redirección
     */
    preparePaymentRedirection: (referencia) => {
        if (!referencia) {
            throw new Error('Referencia de pago no proporcionada');
        }
        
        return {
            frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
            ref_payco: referencia
        };
    },

    /**
     * Procesa la respuesta del pago y prepara los datos para redirección
     * @param {Object} paymentResponse - Datos de respuesta del pago
     * @returns {Object} Datos para la redirección
     */
    processPaymentResponse: (paymentResponse) => {
        const {
            ref_payco,
            x_transaction_state,
            x_response,
            x_approval_code,
            x_amount
        } = paymentResponse;

        // Si no hay referencia de pago, redirigir a error
        if (!ref_payco) {
            return {
                success: false,
                redirectUrl: '/payment/error',
                queryParams: 'message=No se recibió referencia de pago'
            };
        }

        // Determinar la URL de redirección según el estado del pago
        let redirectUrl;
        let queryParams = `ref_payco=${ref_payco}`;

        // Mapeo de estados de ePayco
        const estados = {
            'Aceptada': {
                type: 'success',
                message: 'Pago exitoso',
                params: () => {
                    let params = queryParams;
                    if (x_approval_code) params += `&approval_code=${x_approval_code}`;
                    if (x_amount) params += `&amount=${x_amount}`;
                    return params;
                }
            },
            'Aprobada': {
                type: 'success',
                message: 'Pago aprobado',
                params: () => {
                    let params = queryParams;
                    if (x_approval_code) params += `&approval_code=${x_approval_code}`;
                    if (x_amount) params += `&amount=${x_amount}`;
                    return params;
                }
            },
            'Rechazada': {
                type: 'error',
                message: 'Pago rechazado por el banco'
            },
            'Fallida': {
                type: 'error',
                message: 'Error en el procesamiento del pago'
            },
            'Cancelada': {
                type: 'error',
                message: 'Pago cancelado por el usuario'
            },
            'Abandonada': {
                type: 'error',
                message: 'Proceso de pago abandonado'
            },
            'Pendiente': {
                type: 'pending',
                message: 'El pago está pendiente de confirmación'
            }
        };

        // Obtener configuración del estado o usar valores por defecto
        const estado = estados[x_transaction_state] || {
            type: 'error',
            message: 'Estado de pago no reconocido'
        };

        // Construir URL y parámetros
        redirectUrl = `/payment/${estado.type}`;
        queryParams = estado.params 
            ? estado.params() 
            : `${queryParams}&message=${encodeURIComponent(estado.message)}`;

        return {
            success: true,
            redirectUrl,
            queryParams,
            status: x_transaction_state,
            message: estado.message
        };
    }
};

module.exports = paymentData; 