const orderData = require('./orderData');

class PaymentData {
    /**
     * Procesa la confirmación de pago recibida de ePayco
     * @param {Object} paymentInfo - Información del pago recibida del webhook
     * @returns {Object} Resultado del procesamiento
     */
    async handlePaymentConfirmation(paymentInfo) {
        const {
            x_ref_payco,
            x_transaction_state,
            x_response,
            x_approval_code,
            x_id_invoice,
            x_amount,
            x_extra1,
        } = paymentInfo;

        // Obtener la referencia del pago
        const referencia = x_ref_payco;
        if (!referencia) {
            console.log('Referencia de pago no proporcionada');
            return { success: true };
        }

        // Obtener ID de la orden
        const orderId = x_extra1 || x_id_invoice;
        if (!orderId) {
            console.log('ID de orden no proporcionado');
            return { success: true };
        }

        // Determinar el estado del pago
        const estadoPago = x_transaction_state || x_response;
        console.log(`Procesando pago para orden ${orderId} con referencia ${referencia} y estado ${estadoPago}`);

        // Si el pago es exitoso, confirmar la orden
        if (estadoPago === 'Aceptada' || estadoPago === '1' || x_response === 'Aceptada') {
            // Actualizar la orden con los datos de pago de ePayco
            await orderData.updateOrderPayment(orderId, {
                epaycoRef: referencia,
                paymentStatus: 'COMPLETED',
                paymentData: {
                    transactionId: referencia,
                    approvalCode: x_approval_code,
                    amount: x_amount,
                    transactionDate: new Date(),
                    responseCode: x_response,
                    paymentMethod: paymentInfo.x_franchise || 'N/A',
                    last4: paymentInfo.x_cardnumber ? paymentInfo.x_cardnumber.slice(-4) : 'N/A'
                }
            });

            console.log(`Información de pago actualizada para orden ${orderId}`);

            // Confirmar la orden y generar QRs
            await orderData.confirmOrder(orderId);
            console.log(`Orden ${orderId} confirmada exitosamente a través de webhook ePayco`);
        } else {
            // Actualizar el estado del pago en la orden cuando falla
            await orderData.updateOrderPayment(orderId, {
                epaycoRef: referencia,
                paymentStatus: 'FAILED',
                paymentData: {
                    transactionId: referencia,
                    responseCode: x_response,
                    transactionDate: new Date(),
                    status: estadoPago
                }
            });
            console.log(`Pago rechazado o pendiente para la orden ${orderId}: ${estadoPago}`);
        }

        return { success: true };
    }

    /**
     * Procesa la respuesta del pago y prepara los datos para redirección
     * @param {Object} queryParams - Parámetros de la respuesta del pago
     * @returns {Object} Datos para la redirección
     */
    processPaymentResponse(queryParams) {
        try {
            const {
                x_ref_payco,
                x_transaction_state,
                x_response,
                x_id_invoice
            } = queryParams;

            // Construir los parámetros de redirección
            const redirectParams = new URLSearchParams({
                ref: x_ref_payco || '',
                status: x_transaction_state || x_response || 'pending',
                orderId: x_id_invoice || ''
            }).toString();

            // Determinar la URL de redirección basada en el estado
            const baseRedirectUrl = x_transaction_state === 'Aceptada' || x_response === 'Aceptada'
                ? '/payment/success'
                : '/payment/error';

            return {
                redirectUrl: baseRedirectUrl,
                queryParams: redirectParams
            };
        } catch (error) {
            console.error('Error procesando respuesta de pago:', error);
            return {
                redirectUrl: '/payment/error',
                queryParams: new URLSearchParams({
                    message: 'Error procesando el pago'
                }).toString()
            };
        }
    }
}

module.exports = new PaymentData(); 