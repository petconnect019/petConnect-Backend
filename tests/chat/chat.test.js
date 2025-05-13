const request = require('supertest');
const app = require('../../src/server');
const { createTestUserAndGetToken, createTestPet } = require('../utils/test-helpers');

describe('Endpoints de Chat', () => {
  let userToken, otherUserToken;
  let testPet;
  
  beforeEach(async () => {
    userToken = await createTestUserAndGetToken(app);
    otherUserToken = await createTestUserAndGetToken(app);
    testPet = await createTestPet(app, userToken);
  });

  describe('POST /api/chat/pet/:petId/start', () => {
    it('debería iniciar un chat con el dueño de una mascota', async () => {
      const response = await request(app)
        .post(`/api/chat/pet/${testPet.id}/start`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('chatId');
    });
  });

  describe('GET /api/chat', () => {
    it('debería obtener todos los chats del usuario', async () => {
      const response = await request(app)
        .get('/api/chat')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
}); 