// src/routes/admin.js
const express = require('express');
const router = express.Router();
const { scrapeFuelPrices } = require('../services/fuelPriceService');

/**
 * POST /api/fuel/update
 * Trigger fuel price update (cron-job.org or manual POST request)
 */
router.post('/update', async (req, res) => {
    console.log('🔁 Manual or cron fuel price update triggered...');
    
    try {
        const prices = await scrapeFuelPrices(); // запускаємо скрейпер

        res.status(200).json({
            success: true,
            message: '✅ Fuel prices updated successfully!',
            count: prices?.length || 0
        });
    } catch (err) {
        console.error('❌ Fuel price update failed:', err.message);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

/**
 * GET /api/fuel/update
 * Optional: allow testing in the browser
 */
router.get('/update', async (req, res) => {
    console.log('🌍 Manual GET request to update fuel prices...');

    try {
        const prices = await scrapeFuelPrices();

        res.status(200).json({
            success: true,
            message: '✅ Fuel prices updated successfully (GET)!',
            count: prices?.length || 0
        });
    } catch (err) {
        console.error('❌ Fuel price update (GET) failed:', err.message);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

module.exports = router;
