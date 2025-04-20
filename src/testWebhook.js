// Script para simular una notificación de pago de ePayco
require('dotenv').config();
const axios = require('axios');

async function simulateEpaycoNotification() {
  try {
    // ID de la orden que queremos actualizar
    const orderId = '68052dcd6844dcebe379bf98'; // ID de la orden que creamos previamente
    
    // URL de confirmación a la que enviaremos la notificación
    const confirmationUrl = 'http://localhost:5000/confirmation';
    console.log('Enviando notificación a:', confirmationUrl);

    // Crear datos simulados de ePayco (similar a los que enviaría en producción)
    const epaycoNotificationData = {
      x_cust_id_cliente: '1548409',
      x_ref_payco: 'a9439f55da754e6d59564439', // Referencia única del pago
      x_id_invoice: orderId,
      x_description: 'Compra de QR en PetConnect',
      x_amount: '30000',
      x_currency_code: 'COP',
      x_transaction_id: 'TX-' + Date.now(), // ID único de transacción
      x_transaction_date: new Date().toISOString(),
      x_amount_country: '30000',
      x_response: 'Aceptada', // Estado del pago: Aceptada, Rechazada, Pendiente, etc.
      x_approval_code: 'AP-' + Math.floor(Math.random() * 1000000),
      x_franchise: 'TEST',
      x_bank_name: 'Banco de prueba',
      x_response_reason_text: 'Aprobada'
    };
    
    console.log('Datos de notificación a enviar:', epaycoNotificationData);
    
    // Enviar solicitud POST a la URL de confirmación
    const response = await axios.post(confirmationUrl, epaycoNotificationData);
    
    console.log('Respuesta recibida:');
    console.log('Código de estado:', response.status);
    console.log('Datos de respuesta:', response.data);
    
    console.log('\nAhora verifica el estado de la orden con:');
    console.log('node src/checkOrder.js');
    
  } catch (error) {
    console.error('Error al enviar notificación simulada:');
    if (error.response) {
      // La solicitud se hizo y el servidor respondió con un código de estado
      // que cae fuera del rango de 2xx
      console.error('Código de estado:', error.response.status);
      console.error('Datos de respuesta:', error.response.data);
    } else if (error.request) {
      // La solicitud se hizo pero no se recibió respuesta
      console.error('No se recibió respuesta del servidor:', error.request);
    } else {
      // Algo ocurrió al configurar la solicitud
      console.error('Error:', error.message);
    }
  }
}

// Ejecutar la simulación
simulateEpaycoNotification(); 