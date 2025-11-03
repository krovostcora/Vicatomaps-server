// src/routes/toll.routes.js
const express = require('express');
const router = express.Router();

// Controllers
const tollController = require('../controllers/tollController');

// Middlewares
const { validate } = require('../middlewares/requestValidator');
const { externalAPILimiter } = require('../middlewares/rateLimiter');

// Validators
const {
    calculateTollsSchema,
    getTollsByCountrySchema,
    estimateTollsSchema
} = require('../validators/tollValidators');

// ═══════════════════════════════════════════
// SWAGGER DOCUMENTATION
// ═══════════════════════════════════════════

/**
 * @swagger
 * tags:
 *   name: Tolls
 *   description: Toll road calculation and information
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     TollCalculationRequest:
 *       type: object
 *       required:
 *         - route
 *       properties:
 *         route:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               lat:
 *                 type: number
 *                 example: 54.898158
 *               lng:
 *                 type: number
 *                 example: 23.904711
 *         vehicleType:
 *           type: string
 *           enum: [2AxlesAuto, 3AxlesAuto, 4AxlesAuto, Motorcycle, Bus]
 *           default: 2AxlesAuto
 *
 *     TollCalculationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             totalCost:
 *               type: number
 *               example: 45.60
 *             currency:
 *               type: string
 *               example: EUR
 *             tollCount:
 *               type: integer
 *               example: 3
 *             tolls:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   cost:
 *                     type: number
 *                   currency:
 *                     type: string
 *                   source:
 *                     type: string
 *                     enum: [database, vignette, estimated]
 *             isEstimated:
 *               type: boolean
 *             countries:
 *               type: array
 *               items:
 *                 type: string
 *         meta:
 *           type: object
 *           properties:
 *             timestamp:
 *               type: string
 *               format: date-time
 *             requestId:
 *               type: string
 */

// ═══════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════

/**
 * @swagger
 * /api/tolls/calculate:
 *   post:
 *     summary: Calculate toll costs for a route
 *     tags: [Tolls]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TollCalculationRequest'
 *     responses:
 *       200:
 *         description: Toll calculation successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TollCalculationResponse'
 *       400:
 *         description: Invalid request data
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
router.post(
    '/calculate',
    externalAPILimiter, // Rate limiting (50 req/hour)
    validate(calculateTollsSchema), // Валідація даних
    tollController.calculateTolls // Controller метод
);
/**
 * @swagger
 * /api/tolls/debug:
 *   post:
 *     summary: Debug toll calculation (shows what MongoDB finds)
 *     tags: [Tolls - Debug]
 */
router.post(
    '/debug',
    validate(calculateTollsSchema),
    tollController.debugTollQuery
);
/**
 * @swagger
 * /api/tolls/estimate:
 *   post:
 *     summary: Get rough toll estimate (fallback method)
 *     tags: [Tolls]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TollCalculationRequest'
 *     responses:
 *       200:
 *         description: Estimation successful
 */
router.post(
    '/estimate',
    validate(estimateTollsSchema),
    tollController.estimateTolls
);

/**
 * @swagger
 * /api/tolls/country/{countryCode}:
 *   get:
 *     summary: Get all toll roads in a country
 *     tags: [Tolls]
 *     parameters:
 *       - in: path
 *         name: countryCode
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *           maxLength: 2
 *         description: Two-letter country code (e.g., PL, FR, IT)
 *       - in: query
 *         name: roadType
 *         schema:
 *           type: string
 *           enum: [highway, expressway, bridge, tunnel, vignette]
 *         description: Filter by road type
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Show only active roads
 *     responses:
 *       200:
 *         description: List of toll roads
 *       400:
 *         description: Invalid country code
 */
router.get(
    '/country/:countryCode',
    validate(getTollsByCountrySchema),
    tollController.getTollsByCountry
);

/**
 * @swagger
 * /api/tolls/stats/{countryCode}:
 *   get:
 *     summary: Get toll statistics for a country
 *     tags: [Tolls]
 *     parameters:
 *       - in: path
 *         name: countryCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Two-letter country code
 *     responses:
 *       200:
 *         description: Country statistics
 */
router.get(
    '/stats/:countryCode',
    tollController.getCountryStats
);

/**
 * @swagger
 * /api/tolls/{id}:
 *   get:
 *     summary: Get toll road details by ID
 *     tags: [Tolls]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the toll road
 *     responses:
 *       200:
 *         description: Toll road details
 *       404:
 *         description: Toll road not found
 */
router.get(
    '/:id',
    tollController.getTollById
);

/**
 * @swagger
 * /api/tolls/cache:
 *   delete:
 *     summary: Clear toll calculation cache (admin only)
 *     tags: [Tolls]
 *     responses:
 *       200:
 *         description: Cache cleared
 *       401:
 *         description: Unauthorized
 */
router.delete(
    '/cache',
    // TODO: Add auth middleware here
    // authMiddleware.isAdmin,
    tollController.clearCache
);

// ═══════════════════════════════════════════
// EXPORT ROUTER
// ═══════════════════════════════════════════

module.exports = router;