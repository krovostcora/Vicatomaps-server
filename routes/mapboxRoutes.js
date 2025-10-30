const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

// ============================================
// MAPBOX ROUTES
// ============================================

/**
 * POST /api/geocode
 * Geocode a location query
 */
router.post('/geocode', async (req, res) => {
    try {
        const { query } = req.body;

        if (!query || query.trim() === '') {
            return res.status(400).json({ error: 'Query is required' });
        }

        const response = await axios.get(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
            {
                params: {
                    access_token: process.env.MAPBOX_ACCESS_TOKEN
                },
                timeout: 10000
            }
        );

        if (response.data.features && response.data.features.length > 0) {
            const coords = response.data.features[0].geometry.coordinates;
            res.json({
                success: true,
                coordinates: {
                    lng: coords[0],
                    lat: coords[1]
                },
                place_name: response.data.features[0].place_name,
                features: response.data.features
            });
        } else {
            res.json({
                success: false,
                error: 'No results found'
            });
        }
    } catch (error) {
        console.error('Geocoding error:', error.message);
        res.status(500).json({
            error: 'Geocoding failed',
            details: error.message
        });
    }
});

/**
 * POST /api/route
 * Calculate route between two points
 */
router.post('/route', async (req, res) => {
    try {
        const { start, end } = req.body;

        if (!start || !end || !start.lng || !start.lat || !end.lng || !end.lat) {
            return res.status(400).json({ error: 'Start and end coordinates required' });
        }

        const response = await axios.get(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${start.lng},${start.lat};${end.lng},${end.lat}`,
            {
                params: {
                    access_token: process.env.MAPBOX_ACCESS_TOKEN,
                    geometries: 'geojson',
                    overview: 'full',
                    steps: 'true'
                },
                timeout: 10000
            }
        );

        if (response.data.routes && response.data.routes.length > 0) {
            const route = response.data.routes[0];
            res.json({
                success: true,
                route: {
                    coordinates: route.geometry.coordinates,
                    distance: route.distance,
                    duration: route.duration,
                    steps: route.legs[0]?.steps || []
                }
            });
        } else {
            res.json({
                success: false,
                error: 'No route found'
            });
        }
    } catch (error) {
        console.error('Route calculation error:', error.message);
        res.status(500).json({
            error: 'Route calculation failed',
            details: error.message
        });
    }
});

module.exports = router;