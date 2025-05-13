const request = require('supertest');
const app = require('../../src/server');
const { createTestUserAndGetToken } = require('../utils/test-helpers');

describe('Endpoints de Usuarios', () => {
  let userToken;
  
  beforeEach(async () => {
    userToken = await createTestUserAndGetToken(app);
  });

  describe('GET /api/users/profile', () => {
    it('debería obtener el perfil del usuario autenticado', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('firstName');
      expect(response.body).toHaveProperty('lastName');
    });
  });

  describe('PUT /api/users/profile', () => {
    it('debería actualizar el perfil del usuario', async () => {
      const actualizacion = {
        firstName: 'Nuevo Nombre',
        lastName: 'Nuevo Apellido'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(actualizacion);

      expect(response.status).toBe(200);
      expect(response.body.firstName).toBe(actualizacion.firstName);
      expect(response.body.lastName).toBe(actualizacion.lastName);
    });
  });
}); 