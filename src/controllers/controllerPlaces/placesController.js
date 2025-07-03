const { placesService } = require('../../services/placesService.js');

/**
 * Handles the request to get nearby places.
 * Validates latitude and longitude, calls the service, and sends the response.
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next middleware function.
 */
const getNearbyPlaces = async (req, res, next) => {
  const { latitude, longitude } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({ message: 'Latitude and longitude are required.' });
  }

  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ message: 'Invalid latitude or longitude format.' });
  }

  try {
    const data = await placesService.findNearbyPlaces(lat, lon);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  placesController: {
    getNearbyPlaces,
  }
}; 