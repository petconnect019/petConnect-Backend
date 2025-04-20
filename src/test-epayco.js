/**
 * Script de prueba para las funcionalidades de Epayco
 * 
 * Ejecutar este archivo con:
 * node src/test-epayco.js
 */

require('dotenv').config();
const epaycoService = require('./services/epaycoService');
const axios = require('axios');

// Configuración - asegúrate de que las variables de entorno estén configuradas
console.log('Configuración de Epayco:');
console.log('EPAYCO_PUBLIC_KEY:', process.env.EPAYCO_PUBLIC_KEY ? 'Configurado' : 'No configurado');
console.log('EPAYCO_PRIVATE_KEY:', process.env.EPAYCO_PRIVATE_KEY ? 'Configurado' : 'No configurado');
console.log('EPAYCO_TEST:', process.env.EPAYCO_TEST);
console.log('\n');

// Función para probar la creación de un token
async function testCreateToken() {
  console.log('Probando creación de token...');
  try {
    const cardInfo = {
      "card[number]": "4575623182290326",
      "card[exp_year]": "2025",
      "card[exp_month]": "12",
      "card[cvc]": "123",
      "hasCvv": true
    };

    const result = await epaycoService.createToken(cardInfo);
    console.log('Resultado de crear token:', result);
    return result;
  } catch (error) {
    console.error('Error al crear token:', error.message);
    return null;
  }
}

// Función para probar la obtención de bancos PSE
async function testGetBanks() {
  console.log('Probando obtención de bancos PSE...');
  try {
    const result = await epaycoService.getBanks();
    console.log('Bancos disponibles:', result.data ? `${result.data.length} bancos encontrados` : 'No se encontraron bancos');
    if (result.data && result.data.length > 0) {
      console.log('Primer banco:', result.data[0]);
    }
    return result;
  } catch (error) {
    console.error('Error al obtener bancos:', error.message);
    return null;
  }
}

// Ejecutar las pruebas
async function runTests() {
  console.log('=== INICIANDO PRUEBAS DE EPAYCO ===\n');

  // Probar creación de token
  const tokenResult = await testCreateToken();
  console.log('\n');

  // Probar obtención de bancos PSE
  const banksResult = await testGetBanks();
  console.log('\n');

  console.log('=== PRUEBAS FINALIZADAS ===');
}

// Ejecutar las pruebas
runTests().catch(error => {
  console.error('Error al ejecutar las pruebas:', error);
});

// Script para simular una notificación de pago de ePayco
async function simulateEpaycoNotification() {
  try {
    // ID de la orden que queremos actualizar
    const orderId = '68052dcd6844dcebe379bf98'; // ID de la orden que creamos previamente
    
    // URL de confirmación a la que enviaremos la notificación
    const confirmationUrl = process.env.NGROK_BACKEND_URL + '/confirmation';
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