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

// Rutas API
app.use('/api', routes);

// Importar el controlador de confirmación para Epayco
const OrderModel = require('./models/OrderModel');

// Actualizar la ruta de confirmación con logs más detallados
app.post('/confirmation', async (req, res) => {
  try {
    console.log('====== CONFIRMACIÓN DE PAGO RECIBIDA ======');
    console.log('Fecha y hora:', new Date().toISOString());
    console.log('Headers:', JSON.stringify(req.headers));
    console.log('Body:', JSON.stringify(req.body));
    console.log('Query params:', JSON.stringify(req.query));
    
    // Datos recibidos de Epayco
    const paymentData = req.body;
    
    // Extraer los datos relevantes enviados por Epayco
    const { x_response, x_transaction_id, x_id_invoice } = paymentData;
    console.log('Datos extraídos:');
    console.log('- x_response:', x_response);
    console.log('- x_transaction_id:', x_transaction_id);
    console.log('- x_id_invoice:', x_id_invoice);
    
    // Verificar si la orden existe
    if (!x_id_invoice) {
      console.log('Error: No se recibió x_id_invoice');
      return res.status(400).json({
        success: false,
        message: 'ID de orden no proporcionado'
      });
    }
    
    console.log('Buscando orden con ID:', x_id_invoice);
    const order = await OrderModel.findById(x_id_invoice);
    
    if (!order) {
      console.log('Error: Orden no encontrada con ID:', x_id_invoice);
      return res.status(404).json({
        success: false,
        message: 'Orden no encontrada'
      });
    }
    
    console.log('Orden encontrada:', order._id);
    console.log('Estado actual:', order.status);
    console.log('Estado de pago actual:', order.paymentStatus);
    
    if (x_response === 'Aceptada') {
      console.log('Pago aceptado. Actualizando orden y generando QR...');
      
      // Actualizar la orden como aceptada y pago completado
      order.status = 'ACCEPTED';
      order.paymentStatus = 'COMPLETED';
      order.transactionId = x_transaction_id;
      
      // Generar códigos QR según la cantidad de códigos comprados
      console.log('Generando', order.quantity, 'códigos QR...');
      // Array para almacenar las referencias a los QR
      let qrReferences = [];
      
      for (let i = 0; i < order.quantity; i++) {
        // Generar contenido para el QR, se puede ajustar según sea necesario
        const qrContent = `OrderId: ${order._id} - QR number: ${i + 1}`;
        console.log(`Generando QR ${i+1} con contenido: ${qrContent}`);
        
        // Generar la imagen QR como data URL
        const qrDataUrl = await QRCode.toDataURL(qrContent);
        
        // Crear un nuevo documento QR
        const newQR = new QRModel({
          orderId: order._id,
          content: qrContent,
          dataUrl: qrDataUrl,
          qrNumber: i + 1,
          isActive: true
        });
        
        // Guardar el QR en la base de datos
        const savedQR = await newQR.save();
        console.log(`QR ${i+1} guardado con ID: ${savedQR._id}`);
        
        // Añadir la referencia al array
        qrReferences.push(savedQR._id);
      }
      
      // Asignar las referencias a la orden
      order.qrCodes = qrReferences;
      console.log(`Se generaron ${qrReferences.length} códigos QR referenciados en la orden`);
      
      // Verificar que el transactionId se haya asignado correctamente
      console.log('Transaction ID asignado:', order.transactionId);
      await order.save();
      console.log('Orden actualizada correctamente');
      
      return res.status(200).json({
        success: true,
        message: 'Confirmación recibida. Orden actualizada y QR generados.',
        data: {
          orderId: order._id,
          transactionId: x_transaction_id,
          quantity: order.quantity,
          qrCodesIds: qrReferences
        }
      });
    } else {
      console.log('Pago rechazado. Actualizando orden como rechazada...');
      
      // Si el pago fue rechazado, actualizar la orden como rechazada
      order.status = 'REJECTED';
      order.paymentStatus = 'FAILED';
      order.transactionId = x_transaction_id;
      await order.save();
      
      console.log('Orden actualizada como rechazada');
      
      return res.status(200).json({
        success: false,
        message: 'Pago rechazado. Orden actualizada.',
        data: {
          orderId: order._id,
          transactionId: x_transaction_id
        }
      });
    }
  } catch (error) {
    console.error('Error al procesar confirmación de pago:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar la confirmación de pago',
      error: error.message
    });
  }
});

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
