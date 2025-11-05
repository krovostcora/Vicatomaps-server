const express = require('express');
const router = express.Router();
const fuelPriceService = require('../services/fuelPriceService');

router.get('/:countryCode/:fuelType', async (req, res, next) => {
    try {
        const { countryCode, fuelType } = req.params;
        const price = await fuelPriceService.getFuelPrice(countryCode, fuelType);
        res.json({ price });
    } catch (error) {
        next(error);
    }
});

router.post('/batch', async (req, res, next) => {
    try {
        const { countries, fuelType } = req.body;
        if (!countries || !Array.isArray(countries)) {
            return res.status(400).json({ error: 'Countries array is required' });
        }
        const prices = await fuelPriceService.getFuelPrices(countries, fuelType);
        res.json({ prices });
    } catch (error) {
        next(error);
    }
});

module.exports = router;