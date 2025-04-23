const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

// Ruta de healthcheck
router.get('/', healthController.checkHealth);

module.exports = router; 