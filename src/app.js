const orderRoutes = require('./routes/orderRoutes');
const cors = require('cors');

// Rutas
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/pets', require('./routes/petRoutes'));
app.use('/api/qrs', require('./routes/qrRoutes'));
app.use('/api/orders', orderRoutes);


// Configuración CORS
app.use(cors({
  origin: [
    'http://localhost:5175',
    'http://localhost:5173', 
    'https://petconnect-backend-production.up.railway.app'
  ],
  credentials: true
})); 