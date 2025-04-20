// Script para verificar los QR generados
require('dotenv').config();
const mongoose = require('mongoose');

async function checkQRs() {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    // Definir el esquema QR para consultar
    const qrSchema = new mongoose.Schema({
      orderId: mongoose.Schema.Types.ObjectId,
      content: String,
      dataUrl: String,
      qrNumber: Number,
      isActive: Boolean,
      createdAt: Date
    }, { 
      timestamps: true 
    });

    // Usar el modelo QR
    const QRModel = mongoose.model('QR', qrSchema);
    
    // Buscar todos los QR
    const qrs = await QRModel.find().sort({ createdAt: -1 });
    
    console.log(`Se encontraron ${qrs.length} códigos QR:`);
    
    qrs.forEach((qr, index) => {
      console.log(`\n--- QR ${index + 1} ---`);
      console.log(`ID: ${qr._id}`);
      console.log(`Orden: ${qr.orderId}`);
      console.log(`Número: ${qr.qrNumber}`);
      console.log(`Contenido: ${qr.content}`);
      console.log(`Activo: ${qr.isActive}`);
      console.log(`Creado: ${qr.createdAt}`);
      // Mostrar solo las primeras 100 caracteres de la dataUrl para no saturar la consola
      console.log(`DataURL: ${qr.dataUrl.substring(0, 100)}...`);
    });
    
  } catch (error) {
    console.error('Error al consultar los QR:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Conexión a MongoDB cerrada');
  }
}

// Ejecutar la verificación
checkQRs(); 