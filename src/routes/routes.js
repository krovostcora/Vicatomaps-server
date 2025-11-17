// routes/routes.js
const express = require('express');
const router = express.Router();
const routeService = require('../services/routeService');
const costService = require('../services/costService');

/**
 * POST /api/routes/calculate
 * Calculate optimal routes with cost breakdown
 *
 * Body:
 * {
 *   "origin": "Berlin, Germany",
 *   "destination": "Paris, France",
 *   "waypoints": ["Prague, Czech Republic"], // optional
 *   "vehicleId": 1,
 *   "optimizeFor": "cost" // or "time"
 * }
 */
router.post('/calculate', async (req, res, next) => {
    try {
        const { origin, destination, waypoints = [], vehicleId, optimizeFor = 'cost' } = req.body;

        console.log('\n=== NEW ROUTE CALCULATION REQUEST ===');
        console.log('Origin:', origin);
        console.log('Destination:', destination);
        console.log('Waypoints:', waypoints);

        // Validation
        if (!origin || !destination) {
            return res.status(400).json({
                error: 'Origin and destination are required'
            });
        }

        if (!vehicleId) {
            return res.status(400).json({
                error: 'Vehicle ID is required'
            });
        }

        // Get route alternatives from Google Routes API
        const routes = await routeService.getRoutes({
            origin,
            destination,
            waypoints,
            alternatives: true
        });

        console.log(`Received ${routes.length} route(s) from Google`);

        // Calculate costs for each route
        const routesWithCosts = await Promise.all(
            routes.map(async (route) => {
                const costs = await costService.calculateRouteCost(route, vehicleId);
                return {
                    ...route,
                    costs
                };
            })
        );

        // Sort routes based on optimization preference
        const sortedRoutes = routesWithCosts.sort((a, b) => {
            if (optimizeFor === 'cost') {
                return a.costs.totalCost - b.costs.totalCost;
            }
            return a.duration - b.duration;
        });

        // ========== AUTO SAVE TRIP ==========
        try {
            const best = sortedRoutes[0];
            const costs = best.costs;

            await UserTrip.create({
                origin: `${origin.lat},${origin.lon}`,
                destination: `${destination.lat},${destination.lon}`,
                waypoints: waypoints.map(w => `${w.lat},${w.lon}`),
                vehicle: vehicleId,
                totalCost: costs.totalCost,
                totalDistance: best.distance,
                fuelCost: costs.fuelCost.total,
                tollCost: costs.tollCost.total,
                duration: best.duration,
                routeData: best
            });

            console.log("💾 Trip saved successfully");
        } catch (err) {
            console.error("⚠️ Trip saving failed:", err.message);
        }


        res.json({
            routes: sortedRoutes,
            optimizedFor: optimizeFor,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Route calculation error:', error.message);
        next(error);
    }


});

/**
 * POST /api/routes/directions
 * Get detailed turn-by-turn directions for a specific route
 */
router.post('/directions', async (req, res, next) => {
    try {
        const { origin, destination, waypoints = [] } = req.body;

        if (!origin || !destination) {
            return res.status(400).json({
                error: 'Origin and destination are required'
            });
        }

        const directions = await routeService.getDirections({
            origin,
            destination,
            waypoints
        });

        res.json(directions);

    } catch (error) {
        next(error);
    }
});

module.exports = router;