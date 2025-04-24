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
    address: String
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

// Pre-validación para asegurar que qrId sea un ObjectId válido
qrScanSchema.pre('validate', function(next) {
  if (this.qrId && !mongoose.Types.ObjectId.isValid(this.qrId)) {
    this.invalidate('qrId', 'El ID del QR debe ser un ObjectId válido');
  }
  next();
});

const QRScanModel = mongoose.model('QRScan', qrScanSchema);

module.exports = QRScanModel; 