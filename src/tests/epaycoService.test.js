/**
 * Ejemplo de uso del servicio de Epayco
 * 
 * Este archivo contiene ejemplos de cómo usar el servicio de Epayco
 * para realizar diferentes operaciones de pago.
 */

require('dotenv').config();
const epaycoService = require('../services/epaycoService');

// Ejemplo de creación de un token de tarjeta
async function testCreateToken() {
  try {
    const cardInfo = {
      "card[number]": "4575623182290326",
      "card[exp_year]": "2025",
      "card[exp_month]": "12",
      "card[cvc]": "123",
      "hasCvv": true
    };

    const tokenResponse = await epaycoService.createToken(cardInfo);
    console.log('Token creado:', tokenResponse);
    return tokenResponse;
  } catch (error) {
    console.error('Error al crear token:', error.message);
  }
}

// Ejemplo de creación de un cliente
async function testCreateCustomer(tokenId) {
  try {
    const customerInfo = {
      token_card: tokenId,
      name: "Usuario",
      last_name: "De Prueba", 
      email: "usuario.prueba@petconnect.com",
      default: true,
      city: "Bogotá",
      address: "Calle Principal #123",
      phone: "3005234321",
      cell_phone: "3010000001"
    };

    const customerResponse = await epaycoService.createCustomer(customerInfo);
    console.log('Cliente creado:', customerResponse);
    return customerResponse;
  } catch (error) {
    console.error('Error al crear cliente:', error.message);
  }
}

// Ejemplo de pago con tarjeta
async function testCreateCharge(customerId, tokenId) {
  try {
    const paymentInfo = {
      token_card: tokenId,
      customer_id: customerId,
      doc_type: "CC",
      doc_number: "1234567890",
      name: "Usuario",
      last_name: "De Prueba",
      email: "usuario.prueba@petconnect.com",
      city: "Bogotá",
      address: "Calle Principal #123",
      phone: "3005234321",
      cell_phone: "3010000001",
      bill: "FC-1234",
      description: "Pago de prueba",
      value: "50000",
      tax: "8000",
      tax_base: "42000",
      currency: "COP",
      dues: "1",
      ip: "127.0.0.1",
      url_response: process.env.FRONTEND_URL + "/respuesta-pago",
      url_confirmation: process.env.API_URL + "/api/payments/confirmation",
      method_confirmation: "POST"
    };

    const chargeResponse = await epaycoService.createCharge(paymentInfo);
    console.log('Pago creado:', chargeResponse);
  } catch (error) {
    console.error('Error al crear pago:', error.message);
  }
}

// Ejemplo de obtención de bancos PSE
async function testGetBanks() {
  try {
    const banksResponse = await epaycoService.getBanks();
    console.log('Bancos disponibles:', banksResponse);
  } catch (error) {
    console.error('Error al obtener bancos:', error.message);
  }
}

// Ejecutar pruebas
async function runTests() {
  console.log('Iniciando pruebas de Epayco...');
  
  // Crear token de tarjeta
  const tokenResponse = await testCreateToken();
  if (tokenResponse && tokenResponse.id) {
    // Crear cliente
    const customerResponse = await testCreateCustomer(tokenResponse.id);
    if (customerResponse && customerResponse.data && customerResponse.data.customerId) {
      // Crear pago
      await testCreateCharge(customerResponse.data.customerId, tokenResponse.id);
    }
  }
  
  // Obtener bancos PSE
  await testGetBanks();
  
  console.log('Pruebas finalizadas');
}

// Descomentar la siguiente línea para ejecutar las pruebas
// runTests(); 