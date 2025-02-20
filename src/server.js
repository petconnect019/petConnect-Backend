require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const { connectDB } = require('./config/db');
const session = require('./config/session');
require('./config/passport');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(morgan('dev'));
app.use(cookieParser());
app.use(session);

// CORS
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['set-cookie']
}));

// Inicializar Passport
app.use(passport.initialize());
app.use(passport.session());

// Usar rutas
app.use('/api', routes);

// Ruta raíz
app.get('/', (req, res) => res.send('🚀 PetConnect Backend funcionando!'));

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});

// Conectar a la base de datos
connectDB();
