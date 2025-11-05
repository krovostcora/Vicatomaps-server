// routes/vehicles.js
const express = require('express');
const router = express.Router();
const vehicleService = require('../services/vehicleService');

router.get('/', async (req, res, next) => {
    try {
        const vehicles = await vehicleService.getAllVehicles();
        res.json({ vehicles });
    } catch (error) {
        next(error);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const vehicle = await vehicleService.getVehicleById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        res.json({ vehicle });
    } catch (error) {
        next(error);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const vehicle = await vehicleService.createVehicle(req.body);
        res.status(201).json({ vehicle });
    } catch (error) {
        next(error);
    }
});

router.put('/:id', async (req, res, next) => {
    try {
        const vehicle = await vehicleService.updateVehicle(req.params.id, req.body);
        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        res.json({ vehicle });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
