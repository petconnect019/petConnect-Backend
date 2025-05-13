const request = require('supertest');
const app = require('../../src/server.test');
const User = require('../../src/models/UserModel');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  await mongoose.connection.close();
});

afterEach(async () => {
  if (mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
});

describe('Auth Endpoints', () => {
  describe('POST /api/auth/register', () => {
    const usuarioValido = {
      email: 'test@example.com',
      password: 'Test123!',
      firstName: 'Test',
      lastName: 'User'
    };

    beforeEach(async () => {
      // Limpiar usuarios antes de cada prueba
      if (User.deleteMany) {
        await User.deleteMany({});
      }
    });

    it('debería registrar un nuevo usuario exitosamente', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(usuarioValido);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user).toHaveProperty('email', usuarioValido.email);
      expect(response.body.user).toHaveProperty('firstName', usuarioValido.firstName);
      expect(response.body.user).toHaveProperty('lastName', usuarioValido.lastName);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('no debería registrar un usuario con email existente', async () => {
      // Primer registro
      await request(app)
        .post('/api/auth/register')
        .send(usuarioValido);

      // Intento de registro con el mismo email
      const response = await request(app)
        .post('/api/auth/register')
        .send(usuarioValido);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('El email ya está registrado');
    });

    it('no debería registrar un usuario con email inválido', async () => {
      const usuarioEmailInvalido = {
        ...usuarioValido,
        email: 'notanemail'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(usuarioEmailInvalido);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('no debería registrar un usuario con contraseña débil', async () => {
      const usuarioPasswordDebil = {
        ...usuarioValido,
        password: '123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(usuarioPasswordDebil);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('no debería registrar un usuario sin campos requeridos', async () => {
      const usuarioIncompleto = {
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(usuarioIncompleto);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('debería crear un usuario con rol "user" por defecto', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(usuarioValido);

      expect(response.status).toBe(201);
      expect(response.body.user).toHaveProperty('role', 'user');
    });

    it('debería hashear la contraseña del usuario', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(usuarioValido);

      const usuarioGuardado = await User.findOne({ email: usuarioValido.email }).select('+password');
      expect(usuarioGuardado.password).not.toBe(usuarioValido.password);
      expect(usuarioGuardado.password).toMatch(/^\$2[aby]\$\d+\$/); // Formato de hash bcrypt
    });

    it('debería manejar nombres y apellidos con caracteres especiales', async () => {
      const usuarioCaracteresEspeciales = {
        ...usuarioValido,
        firstName: 'José María',
        lastName: 'Pérez-García'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(usuarioCaracteresEspeciales);

      expect(response.status).toBe(201);
      expect(response.body.user.firstName).toBe(usuarioCaracteresEspeciales.firstName);
      expect(response.body.user.lastName).toBe(usuarioCaracteresEspeciales.lastName);
    });

    it('debería rechazar contraseñas muy largas', async () => {
      const usuarioPasswordLargo = {
        ...usuarioValido,
        password: 'a'.repeat(73) // Mayor que 72 bytes (límite de bcrypt)
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(usuarioPasswordLargo);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    const usuarioValido = {
      email: 'test@example.com',
      password: 'Test123!',
      firstName: 'Test',
      lastName: 'User'
    };

    beforeEach(async () => {
      await User.deleteMany({});
      await request(app)
        .post('/api/auth/register')
        .send(usuarioValido);
    });

    it('debería iniciar sesión exitosamente con credenciales correctas', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: usuarioValido.email,
          password: usuarioValido.password
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', usuarioValido.email);
    });

    it('no debería iniciar sesión con contraseña incorrecta', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: usuarioValido.email,
          password: 'contraseñaIncorrecta'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('no debería iniciar sesión con email no registrado', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'noexiste@example.com',
          password: usuarioValido.password
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
}); 