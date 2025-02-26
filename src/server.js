require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const { connectDB } = require('./config/db');
const { sessionConfig, sessionLogger } = require('./config/session');
require('./config/passport');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares esenciales
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Configuración de CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['set-cookie']
}));

// Configuración de sesión y autenticación
app.use(sessionConfig);
app.use(passport.initialize());
app.use(passport.session());

// Middleware de logging en desarrollo
if (process.env.NODE_ENV === 'development') {
    app.use(sessionLogger);
}

// Rutas API
app.use('/api', routes);

// Ruta de estado del servidor
app.get('/', (_, res) => res.send('🚀 PetConnect Backend funcionando!'));

// Inicialización del servidor
const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
};

startServer();
