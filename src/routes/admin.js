const express = require('express');
const router = express.Router();
const { scrapeFuelPrices } = require('../services/fuelPriceService');

// ⚡ manual + scheduled trigger
router.post('/update', async (req, res) => {
    try {
        console.log('🔁 Manual or cron fuel price update triggered...');
        await scrapeFuelPrices();
        res.json({ success: true, message: 'Fuel prices updated successfully!' });
    } catch (err) {
        console.error('❌ Fuel price update failed:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
