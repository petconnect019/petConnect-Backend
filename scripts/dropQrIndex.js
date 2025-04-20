/**
 * Script para eliminar el índice qrId_1 de la colección QRs
 * Ejecutar con: npm run drop-qr-index
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function dropQrIndex() {
  try {
    console.log('Conectando a MongoDB...');
    
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');
    
    // Obtener la colección QRs directamente
    const db = mongoose.connection.db;
    const qrCollection = db.collection('qrs');
    
    // Listar los índices actuales
    console.log('Índices actuales en la colección QRs:');
    const indices = await qrCollection.listIndexes().toArray();
    
    console.log(indices);
    
    // Buscar y eliminar el índice qrId_1 si existe
    const hasQrIdIndex = indices.some(index => index.name === 'qrId_1');
    
    if (hasQrIdIndex) {
      console.log('Eliminando índice qrId_1...');
      await qrCollection.dropIndex('qrId_1');
      console.log('Índice qrId_1 eliminado correctamente');
    } else {
      console.log('El índice qrId_1 no existe');
    }
    
    // Cerrar la conexión
    await mongoose.connection.close();
    console.log('Conexión cerrada');
    
    console.log('Operación completada');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Asegurarse de que la conexión se cierra
    if (mongoose.connection) {
      await mongoose.connection.close();
      console.log('Conexión cerrada');
    }
    
    // Salir del proceso
    process.exit(0);
  }
}

// Ejecutar la función
dropQrIndex(); 