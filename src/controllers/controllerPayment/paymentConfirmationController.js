/**
 * Controlador para gestionar las confirmaciones de pago desde Epayco
 */
class PaymentConfirmationController {
  /**
   * Recibe y procesa la confirmación de pago desde Epayco
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async handleConfirmation(req, res) {
    try {
      // Datos recibidos de Epayco
      const paymentData = req.body;
      
      console.log('Confirmación de pago recibida:', JSON.stringify(paymentData));
      
      // Aquí se implementaría la lógica para actualizar el estado del pedido en la base de datos
      // según la información recibida de Epayco
      
      /* Ejemplo de lógica a implementar:
      
      if (paymentData.x_response === 'Aceptada') {
        // Actualizar orden como pagada en la base de datos
        await Order.findByIdAndUpdate(paymentData.x_id_invoice, { 
          paymentStatus: 'PAID',
          transactionId: paymentData.x_transaction_id,
          paymentMethod: paymentData.x_type_payment,
          paymentDate: new Date()
        });
        
        // Enviar notificación al usuario
        await notificationService.sendPaymentConfirmation(paymentData.x_customer_email);
      } else {
        // Actualizar orden como rechazada
        await Order.findByIdAndUpdate(paymentData.x_id_invoice, { 
          paymentStatus: 'REJECTED',
          transactionId: paymentData.x_transaction_id,
          rejectionReason: paymentData.x_response_reason
        });
      }
      */
      
      // Responder a Epayco
      return res.status(200).json({
        success: true,
        message: 'Confirmación recibida y procesada correctamente'
      });
    } catch (error) {
      console.error('Error al procesar confirmación de pago:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Error al procesar la confirmación de pago',
        error: error.message
      });
    }
  }
}

module.exports = new PaymentConfirmationController(); 