/**
 * Script independiente para probar la integración con Epayco
 * Ejecutar con: node src/epaycoTest.js
 */

require('dotenv').config();
const epaycoSdk = require('epayco-sdk-node');
const axios = require('axios');

// Crear instancia de Epayco
const epayco = epaycoSdk({
  apiKey: process.env.EPAYCO_PUBLIC_KEY,
  privateKey: process.env.EPAYCO_PRIVATE_KEY,
  lang: 'ES',
  test: process.env.EPAYCO_TEST === 'true'
});

// Imprimir configuración
console.log('Configuración:');
console.log('EPAYCO_PUBLIC_KEY:', process.env.EPAYCO_PUBLIC_KEY ? 'Configurado' : 'No configurado');
console.log('EPAYCO_PRIVATE_KEY:', process.env.EPAYCO_PRIVATE_KEY ? 'Configurado' : 'No configurado');
console.log('EPAYCO_TEST:', process.env.EPAYCO_TEST);
console.log('--------------------------');

// Función para obtener bancos PSE (prueba sencilla que no requiere autenticación)
async function getBanks() {
  try {
    console.log('Obteniendo lista de bancos...');
    const banks = await epayco.bank.getBanks();
    
    console.log('Respuesta:', banks.success ? 'Exitosa' : 'Fallida');
    
    if (banks.data && banks.data.length > 0) {
      console.log(`Se encontraron ${banks.data.length} bancos`);
      console.log('Primeros 3 bancos:');
      banks.data.slice(0, 3).forEach(bank => {
        console.log(`- ${bank.bankCode}: ${bank.bankName}`);
      });
    } else {
      console.log('No se encontraron bancos o la respuesta tiene un formato inesperado');
      console.log('Respuesta completa:', banks);
    }
    
    return banks;
  } catch (error) {
    console.error('Error al obtener bancos:', error.message);
    if (error.response) {
      console.error('Detalles de la respuesta:', error.response.data);
    }
    return null;
  }
}

// Función para crear un token de tarjeta
async function createToken() {
  try {
    console.log('Creando token de tarjeta...');
    
    const card_info = {
      "card[number]": "4575623182290326",
      "card[exp_year]": "2025",
      "card[exp_month]": "12",
      "card[cvc]": "123"
    };
    
    const token = await epayco.token.create(card_info);
    
    console.log('Respuesta:', token.status ? 'Exitosa' : 'Fallida');
    console.log('Token ID:', token.id || 'No disponible');
    console.log('Respuesta completa:', token);
    
    return token;
  } catch (error) {
    console.error('Error al crear token:', error.message);
    if (error.response) {
      console.error('Detalles de la respuesta:', error.response.data);
    }
    return null;
  }
}

// Ejecutar pruebas
async function runTests() {
  console.log('=== INICIANDO PRUEBAS DE EPAYCO ===\n');
  
  // Probar obtención de bancos
  await getBanks();
  console.log('\n');
  
  // Probar creación de token
  await createToken();
  console.log('\n');
  
  console.log('=== PRUEBAS FINALIZADAS ===');
}

// Ejecutar
runTests().catch(error => {
  console.error('Error general:', error);
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