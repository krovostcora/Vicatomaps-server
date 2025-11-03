// src/routes/mapbox.routes.js
const express = require('express');
const router = express.Router();

// Controllers
const mapboxController = require('../controllers/mapboxController');

// Middlewares
const { validate } = require('../middlewares/requestValidator');
const { generalLimiter } = require('../middlewares/rateLimiter');

// Validators
const {
    geocodeSchema,
    calculateRouteSchema
} = require('../validators/mapboxValidators');

// ═══════════════════════════════════════════
// SWAGGER DOCUMENTATION
// ═══════════════════════════════════════════

/**
 * @swagger
 * tags:
 *   name: Mapbox
 *   description: Geocoding and route calculation
 */

/**
 * @swagger
 * /api/geocode:
 *   post:
 *     summary: Geocode an address or place name
 *     tags: [Mapbox]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 example: "Vilnius, Lithuania"
 *     responses:
 *       200:
 *         description: Geocoding successful
 *       400:
 *         description: Invalid request
 */
router.post(
    '/geocode',
    generalLimiter,
    validate(geocodeSchema),
    mapboxController.geocode
);

/**
 * @swagger
 * /api/route:
 *   post:
 *     summary: Calculate route between two points
 *     tags: [Mapbox]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - start
 *               - end
 *             properties:
 *               start:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                     example: 54.687
 *                   lng:
 *                     type: number
 *                     example: 25.280
 *               end:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                     example: 52.520
 *                   lng:
 *                     type: number
 *                     example: 13.405
 *     responses:
 *       200:
 *         description: Route calculation successful
 *       400:
 *         description: Invalid coordinates
 */
router.post(
    '/route',
    generalLimiter,
    validate(calculateRouteSchema),
    mapboxController.calculateRoute
);

module.exports = router;