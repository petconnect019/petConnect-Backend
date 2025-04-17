require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const { connectDB } = require('./config/db');
const { sessionConfig, sessionLogger } = require('./config/session');
const { setupAdminAccount } = require('./services/setupService');
require('./config/passport');
const routes = require('./routes');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const socketService = require('./services/socketService');
const ngrok = require('@ngrok/ngrok');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5175',
        methods: ['GET', 'POST'],
        credentials: true
    }
});
const PORT = process.env.PORT || 5000;

// Middlewares esenciales
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Configuración de CORS
app.use(cors({
    origin: function(origin, callback) {
        // Permitir solicitudes sin origen (como aplicaciones móviles o curl)
        if (!origin) return callback(null, true);
        
        // Lista de orígenes permitidos
        const allowedOrigins = [
            process.env.FRONTEND_URL || 'http://localhost:5175',
            'http://localhost:3000',
            'http://localhost:5500',
            'http://127.0.0.1:5500',
            'http://localhost:8080'
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(new Error('No permitido por CORS'));
        }
    },
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

// Configuración de Socket.io
socketService.initialize(io);

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Conectado a MongoDB'))
    .catch(err => console.error('Error conectando a MongoDB:', err));

// Ruta de estado del servidor prueba el backend en el navegador (localhost:5000)
app.get('/', (_, res) => res.send('🚀 PetConnect Backend funcionando!'));

// Inicialización del servidor
const startServer = async () => {
    try {
        await connectDB();
        await setupAdminAccount();
        server.listen(PORT, () => {
            console.log(`✅ Servidor corriendo en el puerto http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
};

startServer();

// Configurar ngrok
if (process.env.NODE_ENV === 'development') {
    ngrok.connect({ 
        addr: PORT, 
        authtoken_from_env: true 
    })
    .then(listener => {
        console.log(`Servidor expuesto en: ${listener.url()}`);
        console.log('Configura estas URLs en ePayco:');
        console.log(`URL de Respuesta: ${listener.url()}/payment-response`);
        console.log(`URL de Confirmación: ${listener.url()}/api/payments/epayco/confirmation`);
    })
    .catch(err => console.error('Error al iniciar ngrok:', err));
}
