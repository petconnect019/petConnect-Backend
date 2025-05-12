const mongoose = require('mongoose');

const qrScanSchema = new mongoose.Schema({
  qrId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QR',
    required: true
  },
  scannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  scanDate: {
    type: Date,
    default: Date.now
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String,
    departamento: String,
    ciudad: String
  }
}, { 
  timestamps: true,
  // Opciones para mejorar la conversión de tipos
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índice para mejorar el rendimiento de consultas
qrScanSchema.index({ qrId: 1 });
qrScanSchema.index({ scanDate: -1 });

// Virtual para formatear la fecha y hora
qrScanSchema.virtual('formattedDate').get(function() {
  return this.scanDate.toLocaleDateString('es-CO');
});

qrScanSchema.virtual('formattedTime').get(function() {
  return this.scanDate.toLocaleTimeString('es-CO', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
});

// Pre-validación para asegurar que qrId sea un ObjectId válido
qrScanSchema.pre('validate', function(next) {
  if (this.qrId && !mongoose.Types.ObjectId.isValid(this.qrId)) {
    this.invalidate('qrId', 'El ID del QR debe ser un ObjectId válido');
  }
  next();
});

const QRScanModel = mongoose.model('QRScan', qrScanSchema);

module.exports = QRScanModel; 