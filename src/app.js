const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const cors = require('cors');

// Rutas
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/pets', require('./routes/petRoutes'));
app.use('/api/qrs', require('./routes/qrRoutes'));
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

// Configuración CORS
app.use(cors({
  origin: [
    'http://localhost:5175',
    'http://localhost:5173', 
    'https://3e1c-2800-e2-9880-939-38ee-462-d817-2350.ngrok-free.app'
  ],
  credentials: true
})); 