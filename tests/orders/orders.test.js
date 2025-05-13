const request = require('supertest');
const app = require('../../src/server');
const { createTestUserAndGetToken } = require('../utils/test-helpers');

describe('Endpoints de Órdenes', () => {
  let userToken;
  
  beforeEach(async () => {
    userToken = await createTestUserAndGetToken(app);
  });

  describe('POST /api/orders', () => {
    it('debería crear una orden correctamente', async () => {
      const ordenPrueba = {
        quantity: 2,
        paymentMethod: 'credit_card'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(ordenPrueba);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('orderId');
      expect(response.body).toHaveProperty('status', 'pending');
      expect(response.body).toHaveProperty('quantity', ordenPrueba.quantity);
    });
  });

  describe('GET /api/orders', () => {
    it('debería obtener las órdenes del usuario', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
}); 