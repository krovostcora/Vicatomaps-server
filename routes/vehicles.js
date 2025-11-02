const express = require('express');
const router = express.Router();
const Vehicle = require('../src/models/Vehicle');

// Search vehicles
router.get('/search', async (req, res) => {
    try {
        const { manufacturer, model, year } = req.query;
        const query = {};

        if (manufacturer) {
            query.manufacturer = new RegExp(manufacturer, 'i');
        }
        if (model) {
            query.model = new RegExp(model, 'i');
        }
        if (year) {
            query.year = parseInt(year);
        }

        const vehicles = await Vehicle.find(query).limit(50);
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get vehicle by ID
router.get('/:id', async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        res.json(vehicle);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add vehicle
router.post('/', async (req, res) => {
    try {
        const vehicle = new Vehicle(req.body);
        await vehicle.save();
        res.status(201).json(vehicle);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;