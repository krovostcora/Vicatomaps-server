// src/routes/fuelPrices.js
const express = require('express');
const FuelPrice = require('../models/FuelPrice');

const router = express.Router();

// GET /fuel-prices — return all fuel prices
router.get('/', async (req, res) => {
    try {
        const prices = await FuelPrice.find().sort({ country: 1 });
        res.json(prices);
    } catch (err) {
        console.error('Failed to fetch fuel prices:', err);
        res.status(500).json({ error: 'Failed to fetch fuel prices' });
    }
});

module.exports = router;
