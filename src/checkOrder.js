require('dotenv').config();
const mongoose = require('mongoose');
const OrderModel = require('./models/OrderModel');

async function checkOrders() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    // Buscar la orden más reciente
    const recentOrders = await OrderModel.find()
      .sort({ createdAt: -1 })
      .limit(5);

    if (recentOrders.length === 0) {
      console.log('No se encontraron órdenes en la base de datos.');
    } else {
      console.log(`Encontradas ${recentOrders.length} órdenes recientes:`);
      
      recentOrders.forEach((order, index) => {
        console.log(`\nOrden #${index + 1}:`);
        console.log(`ID: ${order._id}`);
        console.log(`Usuario: ${order.userId}`);
        console.log(`Cantidad de QRs: ${order.quantity}`);
        console.log(`Monto total: ${order.totalAmount}`);
        console.log(`Estado: ${order.status}`);
        console.log(`Estado de pago: ${order.paymentStatus}`);
        console.log(`Fecha de creación: ${order.createdAt}`);
        console.log(`QR codes generados: ${order.qrCodes ? order.qrCodes.length : 0}`);
        console.log(`TransactionId: ${order.transactionId || 'No asignado'}`);
      });
    }
  } catch (error) {
    console.error('Error al verificar órdenes:', error);
  } finally {
    // Cerrar la conexión a MongoDB
    await mongoose.connection.close();
    console.log('Conexión a MongoDB cerrada');
  }
}

// Ejecutar la función
checkOrders(); 