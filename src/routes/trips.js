const express = require('express');
const router = express.Router();
const UserTrip = require('../models/UserTrip');

// GET /api/trips
router.get('/', async (req, res) => {
    try {
        const trips = await UserTrip.find().sort({ createdAt: -1 });
        res.json({ trips });
    } catch (err) {
        console.error('Error loading trips:', err);
        res.status(500).json({ error: 'Failed to load trips' });
    }
});

// POST /api/trips
router.post('/', async (req, res) => {
    try {
        const trip = await UserTrip.create(req.body);
        res.json({ success: true, trip });
    } catch (err) {
        console.error('Error saving trip:', err);
        res.status(500).json({ error: 'Failed to save trip' });
    }
});

module.exports = router;
