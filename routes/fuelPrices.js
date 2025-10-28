const express = require('express');
const router = express.Router();
const FuelPrice = require('../models/FuelPrice');

// Get latest fuel prices by country
router.get('/country/:country', async (req, res) => {
    try {
        const { country } = req.params;
        const { fuelType } = req.query;

        const query = { country: country.toUpperCase() };
        if (fuelType) {
            query.fuelType = fuelType;
        }

        // Get the most recent price for each fuel type
        const prices = await FuelPrice.aggregate([
            { $match: query },
            { $sort: { updatedAt: -1 } },
            {
                $group: {
                    _id: '$fuelType',
                    price: { $first: '$pricePerLiter' },
                    currency: { $first: '$currency' },
                    updatedAt: { $first: '$updatedAt' },
                    region: { $first: '$region' },
                },
            },
        ]);

        res.json({
            country,
            prices,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get fuel prices near a location
router.get('/nearby', async (req, res) => {
    try {
        const { lat, lng, radius = 50000, fuelType } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ error: 'Latitude and longitude required' });
        }

        const query = {
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(lng), parseFloat(lat)],
                    },
                    $maxDistance: parseInt(radius), // meters
                },
            },
        };

        if (fuelType) {
            query.fuelType = fuelType;
        }

        const prices = await FuelPrice.find(query).limit(20);

        res.json({
            location: { lat, lng },
            radius,
            count: prices.length,
            prices,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add/Update fuel price (protected endpoint - add auth middleware)
router.post('/', async (req, res) => {
    try {
        const fuelPrice = new FuelPrice(req.body);
        await fuelPrice.save();
        res.status(201).json(fuelPrice);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Batch update fuel prices
router.post('/batch', async (req, res) => {
    try {
        const { prices } = req.body;
        const results = await FuelPrice.insertMany(prices);
        res.status(201).json({
            inserted: results.length,
            data: results,
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;