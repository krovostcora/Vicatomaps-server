const express = require('express');
const router = express.Router();
const TollRoad = require('../models/TollRoad');

// Get toll roads along a route
router.post('/along-route', async (req, res) => {
    try {
        const { coordinates, vehicleClass = 'car' } = req.body;

        if (!coordinates || coordinates.length < 2) {
            return res.status(400).json({ error: 'Invalid route coordinates' });
        }

        // Create a buffer around the route (approx 1km)
        const route = {
            type: 'LineString',
            coordinates,
        };

        const tollRoads = await TollRoad.find({
            geometry: {
                $near: {
                    $geometry: route,
                    $maxDistance: 1000, // 1km buffer
                },
            },
            active: true,
        });

        // Calculate total toll cost
        let totalCost = 0;
        const detailedTolls = tollRoads.map(toll => {
            const pricing = toll.pricing.find(p => p.vehicleClass === vehicleClass);
            const cost = pricing ? pricing.price : 0;
            totalCost += cost;

            return {
                name: toll.name,
                country: toll.country,
                roadType: toll.roadType,
                cost,
                currency: pricing?.currency || 'EUR',
                pricingType: pricing?.pricingType,
            };
        });

        res.json({
            totalCost,
            currency: 'EUR',
            tollRoadsCount: tollRoads.length,
            tolls: detailedTolls,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get toll roads by country
router.get('/country/:country', async (req, res) => {
    try {
        const { country } = req.params;
        const tollRoads = await TollRoad.find({
            country: country.toUpperCase(),
            active: true,
        });

        res.json({
            country,
            count: tollRoads.length,
            tollRoads,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add toll road (protected endpoint)
router.post('/', async (req, res) => {
    try {
        const tollRoad = new TollRoad(req.body);
        await tollRoad.save();
        res.status(201).json(tollRoad);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
