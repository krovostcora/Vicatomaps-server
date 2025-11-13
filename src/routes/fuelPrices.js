import express from 'express';
import FuelPrice from '../models/FuelPrice.js';

const router = express.Router();

// GET /fuel-prices — return all
router.get('/', async (req, res) => {
    try {
        const prices = await FuelPrice.find().sort({ country: 1 });
        res.json(prices);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch fuel prices' });
    }
});

export default router;
