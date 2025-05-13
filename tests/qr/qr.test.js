const request = require('supertest');
const app = require('../../src/server');
const { createTestUserAndGetToken } = require('../utils/test-helpers');

describe('Endpoints de QR', () => {
  let adminToken;
  
  beforeEach(async () => {
    // Nota: Necesitarás modificar createTestUserAndGetToken para crear un usuario admin
    adminToken = await createTestUserAndGetToken(app, { role: 'admin' });
  });

  describe('POST /api/qr/generate-multiple', () => {
    it('debería generar múltiples códigos QR correctamente', async () => {
      const response = await request(app)
        .post('/api/qr/generate-multiple')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantity: 5 });

      expect(response.status).toBe(201);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(5);
    });
  });
}); 