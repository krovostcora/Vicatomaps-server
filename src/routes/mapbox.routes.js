const express = require('express');
const router = express.Router();
const mapboxController = require('../controllers/mapboxController');

/**
 * POST /api/geocode
 * Geocode a location query
 * Body: { query: "Milan, Italy" }
 */
router.post('/geocode', mapboxController.geocode.bind(mapboxController));

/**
 * POST /api/route
 * Calculate route between two points
 * Body: { start: {lat, lng}, end: {lat, lng} }
 */
router.post('/route', mapboxController.calculateRoute.bind(mapboxController));

module.exports = router;