// Script para limpiar la colección de QR
require('dotenv').config();
const mongoose = require('mongoose');

async function cleanQRCollection() {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    // Borrar la colección de QR directamente
    await mongoose.connection.db.dropCollection('qrs');
    console.log('Colección de QR eliminada con éxito');

  } catch (error) {
    if (error.message.includes('ns not found')) {
      console.log('La colección QR no existe, no es necesario eliminarla');
    } else {
      console.error('Error al limpiar la colección de QR:', error);
    }
  } finally {
    try {
      await mongoose.connection.close();
      console.log('Conexión a MongoDB cerrada');
    } catch (error) {
      console.error('Error al cerrar la conexión:', error);
    }
  }
}

// Ejecutar la limpieza
cleanQRCollection(); 