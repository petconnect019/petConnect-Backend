const express = require('express');
const { placesController } = require('../controllers/controllerPlaces/placesController.js');

const router = express.Router();

/**
 * @swagger
 * /api/v1/places/nearby:
 *   get:
 *     summary: Get nearby pet services
 *     tags: [Places]
 *     parameters:
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *         required: true
 *         description: User's latitude
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *         required: true
 *         description: User's longitude
 *     responses:
 *       200:
 *         description: A list of nearby places
 *       400:
 *         description: Bad request, missing or invalid coordinates
 */
router.get('/nearby', placesController.getNearbyPlaces);

module.exports = router; 