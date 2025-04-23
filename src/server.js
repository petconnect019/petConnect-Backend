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
const QRModel = require('./models/QRModel');
const QRCode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: [
            process.env.FRONTEND_URL,
            process.env.NGROK_FRONTEND_URL,
        ],
        methods: ['GET', 'POST'],
        credentials: true
    }
});
const PORT = process.env.PORT || 5000;

// Middlewares esenciales
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Obtener los orígenes permitidos para CORS
const getAllowedOrigins = () => {
    const origins = [
        'http://localhost:5175', 
        'http://localhost:3000'
    ];
    
    // Añadir URLs de ngrok si están definidas
    if (process.env.NGROK_FRONTEND_URL) {
        origins.push(process.env.NGROK_FRONTEND_URL);
    }
    
    if (process.env.NGROK_DOMAIN) {
        const ngrokUrl = `https://${process.env.NGROK_DOMAIN}`;
        if (!origins.includes(ngrokUrl)) {
            origins.push(ngrokUrl);
        }
    }
    
    return origins;
};

// Configuración de CORS
app.use(cors({
    origin: getAllowedOrigins(),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'X-CSRF-Token'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400 // Cache preflight requests for 24 hours
}));

// Manejar solicitudes OPTIONS
app.options('*', (req, res) => {
    // Obtener el origen de la solicitud
    const origin = req.headers.origin;
    const allowedOrigins = getAllowedOrigins();
    
    // Si el origen está en la lista de permitidos, establecerlo en la respuesta
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:5175');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With, X-CSRF-Token');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.status(204).end();
});

// Configuración de sesión y autenticación
app.use(sessionConfig);
app.use(passport.initialize());
app.use(passport.session());

// Middleware de logging en desarrollo
if (process.env.NODE_ENV === 'development') {
    app.use(sessionLogger);
}

// Endpoint directo para pruebas
app.post('/api/direct-test', (req, res) => {
    console.log('Direct test endpoint called with:', req.body);
    res.json({
        success: true,
        message: 'Direct test endpoint working!',
        body: req.body
    });
});

// Endpoint de healthcheck para Railway
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

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
            if (process.env.NGROK_DOMAIN) {
                console.log(`✅ Ngrok URL: https://${process.env.NGROK_DOMAIN}`);
            }
        });
    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
};

startServer();
