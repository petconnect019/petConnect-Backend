// Script para crear una orden de prueba
require('dotenv').config();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

async function createTestOrder() {
  try {
    // Conectar a MongoDB
    console.log('Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    // Definir el esquema de orden
    const orderSchema = new mongoose.Schema({
      userId: mongoose.Schema.Types.ObjectId,
      quantity: Number,
      totalAmount: Number,
      status: String,
      paymentStatus: String,
      customerName: String,
      customerEmail: String,
      customerLastName: String,
      docNumber: String,
      qrCodes: Array,
      transactionId: String,
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });
    
    const Order = mongoose.model('Order', orderSchema);
    
    // Crear un ID de usuario ficticio (necesario para la relación)
    const fakeUserId = new mongoose.Types.ObjectId();
    
    // Crear una orden de prueba
    const newOrder = new Order({
      userId: fakeUserId,
      quantity: 2, // 2 códigos QR
      totalAmount: 30000, // $30,000 COP
      status: 'pending',
      paymentStatus: 'PENDING',
      customerName: 'Usuario',
      customerEmail: 'test@example.com',
      customerLastName: 'Prueba',
      docNumber: '123456789'
    });
    
    // Guardar la orden
    const savedOrder = await newOrder.save();
    
    console.log('Orden de prueba creada con éxito:');
    console.log(`ID: ${savedOrder._id}`);
    console.log(`Estado: ${savedOrder.status}`);
    console.log(`Estado de pago: ${savedOrder.paymentStatus}`);
    console.log(`Cantidad: ${savedOrder.quantity}`);
    console.log(`Monto: ${savedOrder.totalAmount}`);
    console.log(`Fecha de creación: ${savedOrder.createdAt}`);
    
    console.log('\nUSA ESTE ID PARA PRUEBAS:', savedOrder._id);
    console.log('Configura este ID en la prueba de pago de ePayco (campo x_id_invoice)');
    
  } catch (error) {
    console.error('Error al crear orden de prueba:', error);
  } finally {
    // Cerrar conexión
    if (mongoose.connection) {
      await mongoose.connection.close();
      console.log('Conexión a MongoDB cerrada');
    }
  }
}

// Ejecutar la creación de orden
createTestOrder(); 