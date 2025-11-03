// src/routes/routeCost.routes.js
const express = require('express');
const router = express.Router();
const routeCostController = require('../controllers/routeCostController');

/**
 * POST /api/route-cost/calculate
 * Calculate route cost by coordinates
 *
 * Body:
 * {
 *   "start": { "lat": 45.4642, "lng": 9.1900 },
 *   "end": { "lat": 41.9028, "lng": 12.4964 },
 *   "vehicleType": "2AxlesAuto"
 * }
 */
router.post('/calculate', routeCostController.calculateByCoordinates.bind(routeCostController));

/**
 * POST /api/route-cost/calculate-from-address
 * Calculate route cost by addresses
 *
 * Body:
 * {
 *   "startAddress": "Milan, Italy",
 *   "endAddress": "Rome, Italy",
 *   "vehicleType": "2AxlesAuto"
 * }
 */
router.post('/calculate-from-address', routeCostController.calculateByAddress.bind(routeCostController));

module.exports = router;