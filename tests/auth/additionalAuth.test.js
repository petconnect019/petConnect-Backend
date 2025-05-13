const request = require('supertest');
const app = require('../../src/server.test');
const User = require('../../src/models/UserModel');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

const validUser = {
  email: 'test2@example.com',
  password: 'Test123!',
  firstName: 'Test2',
  lastName: 'User2'
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoose.connection.close();
  await mongoServer.stop();
});

afterEach(async () => {
  if (mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
});


describe('POST /api/auth/logout', () => {
  it('debería cerrar la sesión y limpiar la cookie', async () => {
    // Registramos un usuario para obtener cookies
    const registerRes = await request(app).post('/api/auth/register').send(validUser);
    const cookies = registerRes.headers['set-cookie'] || [];
    const logoutRes = await request(app).post('/api/auth/logout').set('Cookie', cookies);
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body).toHaveProperty('message', 'Sesión cerrada exitosamente');
  });
});

describe('POST /api/auth/refresh-token', () => {
  let refreshTokenCookie;

  beforeEach(async () => {
    // Registrar usuario
    await request(app).post('/api/auth/register').send(validUser);
    
    // Iniciar sesión para obtener refresh token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: validUser.password });
    
    // Guardar la cookie del refresh token
    refreshTokenCookie = loginRes.headers['set-cookie']?.find(cookie => cookie.includes('refreshToken'));
  });

  it('debería retornar error si no se proporciona refreshToken', async () => {
    const res = await request(app)
      .post('/api/auth/refresh-token');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message', 'Refresh token no proporcionado');
  });

  it('debería generar un nuevo token si el refresh token es válido', async () => {
    const res = await request(app)
      .post('/api/auth/refresh-token')
      .set('Cookie', [refreshTokenCookie]);
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
  });
});

describe('POST /api/auth/request-password-reset', () => {
  it('debería enviar instrucciones si el email existe', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app).post('/api/auth/request-password-reset').send({ email: validUser.email });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(typeof res.body.message).toBe('string');
  });

  it('debería retornar error para email inválido', async () => {
    const res = await request(app).post('/api/auth/request-password-reset').send({ email: 'noemail' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

describe('POST /api/auth/reset-password', () => {
  it('debería restablecer la contraseña si el token es válido', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    await request(app).post('/api/auth/request-password-reset').send({ email: validUser.email });
    const user = await User.findOne({ email: validUser.email });
    const resetToken = user.reset_token;
    const newPassword = 'NewTest123!';
    const res = await request(app).post('/api/auth/reset-password').send({ resetToken, newPassword });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Contraseña restablecida con éxito');
  });

  it('debería retornar error si el token es inválido o expirado', async () => {
    const res = await request(app).post('/api/auth/reset-password').send({ resetToken: 'invalid', newPassword: 'NewTest123!' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body).toHaveProperty('error');
  });
});

describe('POST /api/auth/change-password', () => {
  let token;
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const loginRes = await request(app).post('/api/auth/login').send({ email: validUser.email, password: validUser.password });
    token = loginRes.body.accessToken;
  });

  it('debería cambiar la contraseña si la contraseña actual es correcta', async () => {
    const res = await request(app).post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: validUser.password, newPassword: 'NewTest1234!' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Contraseña actualizada exitosamente');
  });

  it('debería retornar error si la contraseña actual es incorrecta', async () => {
    const res = await request(app).post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'WrongPassword', newPassword: 'NewTest1234!' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'Contraseña actual incorrecta');
  });

  it('debería denegar el acceso sin token de autenticación', async () => {
    const res = await request(app).post('/api/auth/change-password')
      .send({ currentPassword: validUser.password, newPassword: 'NewTest1234!' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe('GET /api/auth/google/callback', () => {
  it('debería retornar HTML con script de redirección', async () => {
    const res = await request(app).get('/api/auth/google/callback');
    expect(res.status).toBe(200);
    expect(res.text).toContain('window.opener.postMessage');
  });
});

describe('GET /api/auth/google', () => {
  it('debería redirigir a la página de autenticación de Google', async () => {
    const res = await request(app).get('/api/auth/google');
    expect(res.status).toBe(302);
    // Se espera que la URL de redirección contenga 'google'
    expect(res.headers.location).toMatch(/google/);
  });
}); 