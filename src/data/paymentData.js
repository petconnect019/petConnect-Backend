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
            console.log('Procesando confirmación de pago con datos:', JSON.stringify(paymentInfo, null, 2));
            
            // Extraer información relevante
            const { 
                x_ref_payco, 
                x_transaction_id,
                x_amount,
                x_approval_code,
                x_cod_response,
                x_response,
                x_transaction_state,
                x_extra1, // ID de la orden
                x_franchise,
                x_cardnumber
            } = paymentInfo;

            // Primero intentamos obtener el ID de la orden desde x_extra1
            if (!x_extra1) {
                throw new Error('ID de orden no encontrado en la confirmación de pago');
            }

            // Obtener la orden
            const order = await orderData.getOrderById(x_extra1);
            if (!order) {
                throw new Error(`Orden ${x_extra1} no encontrada`);
            }

            console.log('Orden encontrada:', order);

            // Si el pago es aceptado
            if (x_cod_response === '1' && x_response === 'Aceptada') {
                // Actualizar la orden con la información del pago
                await orderData.updateOrderPayment(x_extra1, {
                    epaycoRef: x_ref_payco,
                    paymentStatus: 'COMPLETED',
                    paymentData: {
                        transactionId: x_transaction_id,
                        approvalCode: x_approval_code,
                        amount: parseFloat(x_amount),
                        transactionDate: new Date(),
                        responseCode: x_cod_response,
                        paymentMethod: x_franchise || 'N/A',
                        last4: x_cardnumber ? x_cardnumber.slice(-4) : 'N/A'
                    }
                });

                // Confirmar la orden y generar QRs
                const result = await orderData.confirmOrder(x_extra1);
                
                return {
                    success: true,
                    message: 'Pago confirmado y orden completada',
                    order: result.order,
                    qrCodes: result.qrCodes
                };
            } else {
                // Si el pago no es aceptado, actualizar el estado
                await orderData.updateOrderPayment(x_extra1, {
                    epaycoRef: x_ref_payco,
                    paymentStatus: 'FAILED',
                    paymentData: {
                        transactionId: x_transaction_id,
                        responseCode: x_cod_response,
                        transactionDate: new Date(),
                        paymentMethod: x_franchise || 'N/A',
                        last4: x_cardnumber ? x_cardnumber.slice(-4) : 'N/A'
                    }
                });

                return {
                    success: false,
                    message: `Pago no aceptado: ${x_response}`,
                    order
                };
            }
        } catch (error) {
            console.error('Error al procesar confirmación de pago:', error);
            throw error;
        }
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
                message: 'Pago cancelado'
            }
        };

        const estado = estados[x_response] || { type: 'error', message: 'Estado desconocido' };

        return {
            success: true,
            type: estado.type,
            message: estado.message,
            queryParams: estado.params ? estado.params() : queryParams
        };
    }
};

module.exports = paymentData; 