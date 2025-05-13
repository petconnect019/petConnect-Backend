require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('passport');
const cookieParser = require('cookie-parser');
require('./config/passport');
const routes = require('./routes');

const app = express();

// Middleware básico
app.use(express.json());
app.use(cookieParser());

// Configuración de CORS simplificada para pruebas
app.use(cors());

// Inicialización de Passport
app.use(passport.initialize());

// Rutas API
app.use('/api', routes);

// Manejo de errores
app.use((err, req, res, next) => {
  // Si el error tiene un código de estado personalizado, úsalo
  const statusCode = err.statusCode || 500;
  
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Error interno del servidor'
  });
});

module.exports = app; 