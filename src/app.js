require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const routes = require('./routes');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const rateLimiter = require('./middlewares/rateLimitMiddleware');
require('./config/passport');

const app = express();
app.set('trust proxy', true);

// Configuración de CORS - debe ir antes de cualquier otro middleware
const origins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  process.env.FRONTEND_URL,
  // Permitir cualquier origen en desarrollo
  ...(process.env.NODE_ENV === 'development' ? ['*'] : [])
].filter(Boolean);

app.use(cors({
    origin: process.env.NODE_ENV === 'development' 
      ? true // Permitir cualquier origen en desarrollo
      : origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middlewares básicos
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Configuración de sesión
app.use(session({
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        dbName: 'petconnect',
        collectionName: 'sessions'
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Autenticación
app.use(passport.initialize());
app.use(passport.session());

// Rate limiting - aplicar después de CORS pero antes de las rutas
app.use(rateLimiter);

// Rutas de la API
app.use('/api', routes);

// Ruta de estado
app.get('/', (_, res) => res.send('🚀 PetConnect Backend funcionando!'));

// Manejador de errores global
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
        ok: false,
        message: err.message || 'Error interno del servidor'
    });
});

module.exports = app;