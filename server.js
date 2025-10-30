// routes/routeCost.js - SIMPLIFIED VERSION
const express = require('express');
const router = express.Router();
const axios = require('axios');
const NodeCache = require('node-cache');
const Vehicle = require('./models/Vehicle');

const cache = new NodeCache({ stdTTL: 3600 });

const RAPID_API_KEY = process.env.RAPID_API_KEY;
const TOLLGURU_API_KEY = process.env.TOLLGURU_API_KEY;

/**
 * POST /api/route-cost/calculate
 * Body: { distance, coordinates, vehicleId }
 * Client sends route data, server calculates costs
 */
router.post('/calculate', async (req, res) => {
  try {
    const { distance, coordinates, vehicleId } = req.body;

    if (!distance || !coordinates || !vehicleId) {
      return res.status(400).json({
        error: 'Missing required fields: distance, coordinates, vehicleId'
      });
    }

    console.log(`💰 Calculating costs for ${distance}km route`);

    // 1. Get vehicle
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // 2. Detect countries (with caching)
    const coordKey = `coords_${coordinates[0].lat}_${coordinates[coordinates.length-1].lat}`;
    let countries = cache.get(coordKey);

    if (!countries) {
      countries = await detectCountries(coordinates);
      cache.set(coordKey, countries, 21600);
    }

    // 3. Get fuel prices (with caching)
    const fuelKey = `fuel_${countries.join('_')}_${vehicle.fuelType}`;
    let fuelPrices = cache.get(fuelKey);

    if (!fuelPrices) {
      fuelPrices = await getFuelPrices(countries, vehicle.fuelType);
      cache.set(fuelKey, fuelPrices, 21600);
    }

    // 4. Get toll costs (with caching)
    const tollKey = `toll_${coordKey}_${vehicle.vehicleClass}`;
    let tollData = cache.get(tollKey);

    if (!tollData) {
      tollData = await getTollCosts(coordinates, vehicle.vehicleClass);
      cache.set(tollKey, tollData, 86400);
    }

    // 5. Calculate costs
    const fuelNeeded = (distance * vehicle.fuelConsumption.highway) / 100;
    const avgFuelPrice = Object.values(fuelPrices).reduce((a, b) => a + b, 0) / Object.keys(fuelPrices).length;
    const fuelCost = fuelNeeded * avgFuelPrice;
    const totalCost = fuelCost + tollData.totalCost;

    const result = {
      countries: countries,
      costs: {
        fuelNeeded: parseFloat(fuelNeeded.toFixed(2)),
        fuelPrices: fuelPrices,
        fuelCost: parseFloat(fuelCost.toFixed(2)),
        tollCost: parseFloat(tollData.totalCost.toFixed(2)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        currency: 'EUR'
      },
      tolls: tollData.tolls,
      cached: {
        countries: !!cache.get(coordKey),
        fuel: !!cache.get(fuelKey),
        tolls: !!cache.get(tollKey)
      }
    };

    res.json(result);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Keep the helper functions from before...
async function detectCountries(coordinates) { /* same as before */ }
async function getFuelPrices(countries, fuelType) { /* same as before */ }
async function getTollCosts(coordinates, vehicleClass) { /* same as before */ }

module.exports = router;