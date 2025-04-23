const OrderModel = require('../models/OrderModel');
const QRModel = require('../models/QRModel');
const orderData = require('./orderData');

const paymentData = {
    /**
     * Procesa la confirmación de pago recibida de ePayco
     * @param {Object} paymentInfo - Información del pago recibida del webhook
     * @returns {Object} Resultado del procesamiento
     */
    processPaymentConfirmation: async (paymentInfo) => {
        try {
            const { 
                x_ref_payco,           // Referencia de pago
                x_transaction_state,   // Estado de la transacción
                x_response,            // Respuesta del pago
                x_approval_code,       // Código de aprobación
                x_id_invoice,          // ID de la factura
                x_amount,              // Monto pagado
                x_extra1,              // Campo extra donde enviamos el orderId
                x_cod_transaction_state // Código del estado de la transacción
            } = paymentInfo;

            // Validar datos requeridos
            if (!x_ref_payco) {
                return { success: false, message: 'Referencia de pago no proporcionada' };
            }

            const orderId = x_extra1 || x_id_invoice;
            if (!orderId) {
                return { success: false, message: 'ID de orden no proporcionado' };
            }

            console.log(`Procesando pago para orden ${orderId} con referencia ${x_ref_payco} y estado ${x_transaction_state}`);

            // Determinar el estado del pago
            const estadoPago = x_transaction_state;
            const esPagoExitoso = estadoPago === 'Aceptada' || estadoPago === '1' || x_response === 'Aceptada' || x_cod_transaction_state === '1';
            const esPagoRechazado = estadoPago === 'Rechazada' || estadoPago === '2' || x_response === 'Rechazada' || x_cod_transaction_state === '2';
            const esPagoCancelado = estadoPago === 'Cancelada' || estadoPago === '3' || x_response === 'Cancelada' || x_cod_transaction_state === '3';

            if (esPagoExitoso) {
                return await paymentData.processSuccessfulPayment(orderId, {
                    referencia: x_ref_payco,
                    approvalCode: x_approval_code,
                    amount: x_amount,
                    response: x_response,
                    additionalData: paymentInfo
                });
            } else if (esPagoRechazado || esPagoCancelado) {
                return await paymentData.processFailedPayment(orderId, {
                    referencia: x_ref_payco,
                    amount: x_amount,
                    response: x_response,
                    additionalData: paymentInfo
                });
            } else {
                return { 
                    success: true, 
                    message: `Pago pendiente para la orden ${orderId}`,
                    status: 'PENDING'
                };
            }
        } catch (error) {
            console.error('Error al procesar confirmación de pago:', error);
            return { success: false, message: error.message };
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
            x_approval_code,
            x_amount,
            x_response_reason_text
        } = paymentResponse;

        // Validación básica
        if (!ref_payco) {
            return {
                success: false,
                redirectUrl: '/payment/error',
                queryParams: 'message=No se recibió referencia de pago'
            };
        }

        // Configuración base de redirección
        const baseParams = `ref_payco=${ref_payco}`;

        // Mapeo simplificado de estados
        const estados = {
            'Aceptada': {
                type: 'success',
                message: 'Pago exitoso',
                params: () => {
                    let params = baseParams;
                    if (x_approval_code) params += `&approval_code=${x_approval_code}`;
                    if (x_amount) params += `&amount=${x_amount}`;
                    return params;
                }
            },
            'Aprobada': {
                type: 'success',
                message: 'Pago aprobado',
                params: () => {
                    let params = baseParams;
                    if (x_approval_code) params += `&approval_code=${x_approval_code}`;
                    if (x_amount) params += `&amount=${x_amount}`;
                    return params;
                }
            },
            'Rechazada': {
                type: 'error',
                message: x_response_reason_text || 'Pago rechazado por el banco'
            },
            'Fallida': {
                type: 'error',
                message: x_response_reason_text || 'Error en el procesamiento del pago'
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
        const redirectUrl = `/payment/${estado.type}`;
        const queryParams = estado.params 
            ? estado.params() 
            : `${baseParams}&message=${encodeURIComponent(estado.message)}`;

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