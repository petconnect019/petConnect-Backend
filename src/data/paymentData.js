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
            const { referencia, estadoPago, orderId, x_approval_code, x_amount, x_response } = paymentInfo;
            
            // En lugar de lanzar un error, devolver un objeto de respuesta para manejar esto en el controlador
            if (!referencia) {
                return {
                    success: false,
                    message: 'Referencia de pago no proporcionada'
                };
            }
            
            if (!orderId) {
                return {
                    success: false,
                    message: 'ID de orden no proporcionado'
                };
            }
            
            console.log(`Procesando confirmación de pago para referencia: ${referencia}, estado: ${estadoPago}, orderId: ${orderId}`);
            
            // Buscar la orden
            let order;
            try {
                order = await OrderModel.findById(orderId);
                if (!order) {
                    return {
                        success: false,
                        message: `Orden ${orderId} no encontrada`
                    };
                }
            } catch (error) {
                console.error(`Error al buscar orden ${orderId}:`, error);
                return {
                    success: false,
                    message: 'Orden no encontrada o ID inválido'
                };
            }
            
            // Determinar el estado del pago según ePayco
            let paymentStatus = 'PENDING';
            if (estadoPago === '1' || estadoPago === 1 || estadoPago === 'Aceptada') {
                paymentStatus = 'COMPLETED';
            } else if (estadoPago === '2' || estadoPago === 2 || estadoPago === 'Rechazada') {
                paymentStatus = 'REJECTED';
            } else if (estadoPago === '3' || estadoPago === 3 || estadoPago === 'Pendiente') {
                paymentStatus = 'PENDING';
            } else if (estadoPago === '4' || estadoPago === 4 || estadoPago === 'Fallida') {
                paymentStatus = 'FAILED';
            }
            
            console.log(`Estado de pago determinado: ${paymentStatus}`);
            
            // Actualizar la orden con la información de pago
            const paymentUpdateData = {
                paymentStatus,
                epaycoRef: referencia,
                paymentData: {
                    approvalCode: x_approval_code,
                    amount: x_amount,
                    response: x_response,
                    ...paymentInfo.additionalData
                }
            };
            
            try {
                await orderData.updateOrderPayment(orderId, paymentUpdateData);
                
                // Si el pago fue exitoso, confirmar la orden para generar QRs
                if (paymentStatus === 'COMPLETED' && order.status === 'pending') {
                    try {
                        await orderData.confirmOrder(orderId);
                        console.log(`Orden ${orderId} confirmada exitosamente después del pago`);
                    } catch (error) {
                        console.error(`Error al generar QRs para la orden ${orderId}: ${error.message}`);
                        // El pago se procesó correctamente, pero hubo un error al generar los QRs
                        // Actualizamos solo el estado de pago sin generar QRs
                        await OrderModel.findByIdAndUpdate(
                            orderId,
                            {
                                paymentStatus: 'COMPLETED',
                                epaycoRef: referencia
                            }
                        );
                        
                        return {
                            success: true,
                            message: `Pago procesado correctamente, pero hubo un error al generar los QRs: ${error.message}`,
                            orderId,
                            status: paymentStatus,
                            qrGenerated: false
                        };
                    }
                }
                
                return {
                    success: true,
                    message: `Pago procesado: ${paymentStatus}`,
                    orderId,
                    status: paymentStatus
                };
            } catch (error) {
                console.error(`Error al actualizar orden con datos de pago:`, error);
                return {
                    success: false,
                    message: `Error al actualizar datos de pago: ${error.message}`
                };
            }
        } catch (error) {
            console.error('Error en processPaymentConfirmation:', error);
            return {
                success: false,
                message: error.message
            };
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
    }
};

module.exports = paymentData; 