const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// Rutas
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes); 