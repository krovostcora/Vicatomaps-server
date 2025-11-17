const express = require('express');
const router = express.Router();
const UserTrip = require('../models/UserTrip');

// GET /api/trips - Отримати всі поїздки
router.get('/', async (req, res) => {
    try {
        const trips = await UserTrip.find()
            .populate('vehicle')
            .sort({ createdAt: -1 });
        
        res.json({ trips });
    } catch (err) {
        console.error('Error loading trips:', err);
        res.status(500).json({ error: 'Failed to load trips' });
    }
});

// GET /api/trips/:id - Отримати одну поїздку за ID
router.get('/:id', async (req, res) => {
    try {
        const trip = await UserTrip.findById(req.params.id)
            .populate('vehicle');
        
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }
        
        res.json({ trip });
    } catch (err) {
        console.error('Error loading trip:', err);
        res.status(500).json({ error: 'Failed to load trip' });
    }
});

// POST /api/trips - Створити нову поїздку
router.post('/', async (req, res) => {
    try {
        const trip = await UserTrip.create(req.body);
        res.json({ success: true, trip });
    } catch (err) {
        console.error('Error saving trip:', err);
        res.status(500).json({ error: 'Failed to save trip' });
    }
});

// DELETE /api/trips/:id - Видалити поїздку
router.delete('/:id', async (req, res) => {
    try {
        const trip = await UserTrip.findByIdAndDelete(req.params.id);
        
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }
        
        res.json({ success: true, message: 'Trip deleted successfully' });
    } catch (err) {
        console.error('Error deleting trip:', err);
        res.status(500).json({ error: 'Failed to delete trip' });
    }
});

module.exports = router;
