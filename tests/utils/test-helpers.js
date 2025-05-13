const request = require('supertest');
const jwt = require('jsonwebtoken');

/**
 * Crea un usuario de prueba y devuelve el token
 * @param {Object} app - Express app
 * @param {Object} userData - Datos del usuario
 * @returns {Promise<string>} Token JWT
 */
async function createTestUserAndGetToken(app, userData = {}) {
  const defaultUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'Test123!',
    firstName: 'Test',
    lastName: 'User',
    ...userData
  };

  const response = await request(app)
    .post('/api/auth/register')
    .send(defaultUser);

  return response.body.token;
}

/**
 * Crea una mascota de prueba
 * @param {Object} app - Express app
 * @param {string} token - Token JWT
 * @param {Object} petData - Datos de la mascota
 * @returns {Promise<Object>} Mascota creada
 */
async function createTestPet(app, token, petData = {}) {
  const defaultPet = {
    name: 'Test Pet',
    species: 'Dog',
    breed: 'Mixed',
    age: 2,
    ...petData
  };

  const response = await request(app)
    .post('/api/pets')
    .set('Authorization', `Bearer ${token}`)
    .send(defaultPet);

  return response.body;
}

/**
 * Genera un código QR de prueba
 * @param {Object} app - Express app
 * @param {string} adminToken - Token JWT de administrador
 * @returns {Promise<Object>} Código QR generado
 */
async function createTestQR(app, adminToken) {
  const response = await request(app)
    .post('/api/qr/generate-multiple')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ quantity: 1 });

  return response.body[0];
}

module.exports = {
  createTestUserAndGetToken,
  createTestPet,
  createTestQR
}; 