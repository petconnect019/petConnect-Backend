// const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACES_API_ENDPOINT = 'https://places.googleapis.com/v1/places:searchNearby';

/**
 * Finds nearby places like veterinary clinics and pet stores using Google Places API.
 * @param {number} latitude - The latitude of the user's location.
 * @param {number} longitude - The longitude of the user's location.
 * @param {string[]} includedTypes - The types of places to search for (e.g., 'veterinary_care', 'pet_store').
 * @param {number} radius - The radius in meters to search within.
 * @returns {Promise<Object>} The response from the Google Places API.
 */
const findNearbyPlaces = async (latitude, longitude, includedTypes = ['veterinary_care', 'pet_store'], radius = 5000) => {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error('Google Places API key is missing. Please set GOOGLE_PLACES_API_KEY environment variable.');
  }

  const requestBody = {
    includedTypes,
    maxResultCount: 15,
    locationRestriction: {
      circle: {
        center: {
          latitude,
          longitude,
        },
        radius,
      },
    },
    languageCode: 'es', // Request results in Spanish
  };

  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
    'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.types,places.rating,places.userRatingCount,places.googleMapsUri,places.internationalPhoneNumber,places.regularOpeningHours,places.websiteUri',
  };

  try {
    const response = await fetch(PLACES_API_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Could not parse error response from Google API.' }));
      console.error('Error from Google Places API:', { status: response.status, data: errorData });
      throw new Error(`Failed to fetch nearby places. Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error making fetch request to Google Places API:', error.message);
    throw new Error('Failed to fetch nearby places from Google API.');
  }
};

const placesService = {
  findNearbyPlaces,
};

module.exports = {
  placesService
}; 