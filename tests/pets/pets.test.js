const request = require('supertest');
const app = require('../../src/server');
const { createTestUserAndGetToken } = require('../utils/test-helpers');

describe('Endpoints de Mascotas', () => {
  let userToken;
  
  beforeEach(async () => {
    userToken = await createTestUserAndGetToken(app);
  });

  describe('POST /api/pets', () => {
    it('debería crear una mascota correctamente', async () => {
      const mascotaPrueba = {
        name: 'Firulais',
        species: 'Dog',
        breed: 'Mixed',
        age: 2
      };

      const response = await request(app)
        .post('/api/pets')
        .set('Authorization', `Bearer ${userToken}`)
        .send(mascotaPrueba);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('name', mascotaPrueba.name);
    });
  });
}); 