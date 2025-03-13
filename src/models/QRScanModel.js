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
});

const QRScanModel = mongoose.model('QRScan', qrScanSchema);

module.exports = QRScanModel; 