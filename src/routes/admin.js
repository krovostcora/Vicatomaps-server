const express = require('express');
const router = express.Router();
const { scrapeFuelPrices } = require('../services/fuelPriceService');

// manual + cron trigger
router.post('/update', async (req, res) => {
    try {
        console.log('🔁 Manual or cron fuel price update triggered...');
        await scrapeFuelPrices();
        res.status(200).json({ success: true, message: '✅ Fuel prices updated successfully!' });
    } catch (err) {
        console.error('❌ Fuel price update failed:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// optional GET version (for browser testing)
router.get('/update', async (req, res) => {
    try {
        console.log('🌍 Manual GET request to update fuel prices...');
        await scrapeFuelPrices();
        res.status(200).json({ success: true, message: '✅ Fuel prices updated successfully (GET)!' });
    } catch (err) {
        console.error('❌ Fuel price update (GET) failed:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
