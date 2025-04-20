// Script para verificar órdenes
require('dotenv').config();
const mongoose = require('mongoose');

async function checkOrders() {
  try {
    // Conectar a MongoDB
    console.log('Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    // Definir el esquema de orden directamente aquí para evitar problemas de importación
    const orderSchema = new mongoose.Schema({
      userId: mongoose.Schema.Types.ObjectId,
      quantity: Number,
      totalAmount: Number,
      status: String,
      paymentStatus: String,
      qrCodes: Array,
      transactionId: String,
      createdAt: Date,
      updatedAt: Date
    });
    
    const Order = mongoose.model('Order', orderSchema);
    
    // Buscar órdenes recientes
    console.log('Buscando órdenes recientes...');
    const recentOrders = await Order.find().sort({createdAt: -1}).limit(5);
    
    console.log(`Se encontraron ${recentOrders.length} órdenes recientes.`);
    
    // Mostrar detalles de cada orden
    recentOrders.forEach((order, index) => {
      console.log(`\n--- Orden ${index + 1} ---`);
      console.log(`ID: ${order._id}`);
      console.log(`Estado: ${order.status}`);
      console.log(`Estado de pago: ${order.paymentStatus}`);
      console.log(`Cantidad: ${order.quantity}`);
      console.log(`Monto: ${order.totalAmount}`);
      console.log(`QR codes: ${order.qrCodes ? order.qrCodes.length : 0}`);
      console.log(`Transaction ID: ${order.transactionId || 'No asignado'}`);
      console.log(`Creado: ${order.createdAt}`);
    });
    
  } catch (error) {
    console.error('Error al verificar órdenes:', error);
  } finally {
    // Cerrar conexión
    if (mongoose.connection) {
      await mongoose.connection.close();
      console.log('Conexión a MongoDB cerrada');
    }
  }
}

// Ejecutar la verificación
checkOrders(); 