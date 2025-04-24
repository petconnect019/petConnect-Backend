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
};

module.exports = paymentData; 