// src/routes/routes.js
const express = require('express');
const router = express.Router();
const { optionalAuth, authenticate } = require('../middleware/authenticate');
const routeService = require('../services/routeService');
const costService = require('../services/costService');
const UserTrip = require('../models/UserTrip');

/**
 * POST /api/routes/calculate
 * Розрахунок маршруту та вартості
 * Працює як для залогінених так і для гостей
 *
 * Body: {
 *   origin: { lat, lon },
 *   destination: { lat, lon },
 *   waypoints?: [{ lat, lon }],
 *   vehicleId: string
 * }
 */
router.post('/calculate', optionalAuth, async (req, res) => {
    try {
        const { origin, destination, waypoints, vehicleId } = req.body;

        // Validation
        if (!origin || !destination || !vehicleId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: origin, destination, vehicleId'
            });
        }

        // Розрахувати маршрут та вартість
        const result = await costService.calculateTripCost(
            origin,
            destination,
            vehicleId,
            waypoints
        );

        // Якщо користувач залогінений - зберегти trip
        if (req.user) {
            try {
                const trip = new UserTrip({
                    userId: req.user._id,
                    vehicleId: vehicleId,
                    origin: result.route?.origin || 'Unknown',
                    destination: result.route?.destination || 'Unknown',
                    originCoords: {
                        lat: origin.lat,
                        lon: origin.lon
                    },
                    destinationCoords: {
                        lat: destination.lat,
                        lon: destination.lon
                    },
                    waypoints: waypoints || [],
                    distance: result.route?.distance,
                    duration: result.route?.duration,
                    fuelCost: result.fuelCost,
                    tollCost: result.tollCost,
                    totalCost: result.totalCost,
                    countries: result.countries
                });

                await trip.save();
                result.tripId = trip._id;
            } catch (saveError) {
                console.error('Failed to save trip:', saveError);
                // Не блокуємо відповідь якщо не вдалось зберегти
            }
        }

        res.json({
            success: true,
            ...result,
            savedToHistory: !!req.user
        });

    } catch (error) {
        console.error('Route calculation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to calculate route',
            details: error.message
        });
    }
});

/**
 * GET /api/routes/history
 * Отримати історію поїздок (тільки для залогінених)
 */
router.get('/history', authenticate, async (req, res) => {
    try {
        const { limit = 20, skip = 0 } = req.query;

        const trips = await Trip.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .populate('vehicleId', 'brand model fuelType');

        const total = await Trip.countDocuments({ userId: req.user._id });

        res.json({
            success: true,
            trips,
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip),
                hasMore: total > parseInt(skip) + parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get trip history'
        });
    }
});

/**
 * GET /api/routes/history/:tripId
 * Отримати деталі конкретної поїздки
 */
router.get('/history/:tripId', authenticate, async (req, res) => {
    try {
        const trip = await Trip.findOne({
            _id: req.params.tripId,
            userId: req.user._id
        }).populate('vehicleId');

        if (!trip) {
            return res.status(404).json({
                success: false,
                error: 'Trip not found'
            });
        }

        res.json({
            success: true,
            trip
        });

    } catch (error) {
        console.error('Get trip error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get trip details'
        });
    }
});

/**
 * DELETE /api/routes/history/:tripId
 * Видалити поїздку з історії
 */
router.delete('/history/:tripId', authenticate, async (req, res) => {
    try {
        const trip = await Trip.findOneAndDelete({
            _id: req.params.tripId,
            userId: req.user._id
        });

        if (!trip) {
            return res.status(404).json({
                success: false,
                error: 'Trip not found'
            });
        }

        // Видалити з user history
        req.user.tripHistory = req.user.tripHistory.filter(
            id => id.toString() !== req.params.tripId
        );
        await req.user.save();

        res.json({
            success: true,
            message: 'Trip deleted successfully'
        });

    } catch (error) {
        console.error('Delete trip error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete trip'
        });
    }
});

/**
 * GET /api/routes/history
 * Отримати історію поїздок користувача
 */
router.get('/history', authenticate, async (req, res, next) => {
    try {
        const { limit = 20, skip = 0 } = req.query;

        const trips = await UserTrip.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .populate('vehicle', 'brand model fuelType');

        const total = await UserTrip.countDocuments({ userId: req.user._id });

        res.json({
            success: true,
            trips,
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip),
                hasMore: total > parseInt(skip) + parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Get history error:', error);
        next(error);
    }
});

/**
 * GET /api/routes/history/:tripId
 * Отримати деталі конкретної поїздки
 */
router.get('/history/:tripId', authenticate, async (req, res, next) => {
    try {
        const trip = await UserTrip.findOne({
            _id: req.params.tripId,
            userId: req.user._id
        }).populate('vehicle');

        if (!trip) {
            return res.status(404).json({
                success: false,
                error: 'Trip not found'
            });
        }

        res.json({
            success: true,
            trip
        });

    } catch (error) {
        console.error('Get trip error:', error);
        next(error);
    }
});

/**
 * DELETE /api/routes/history/:tripId
 * Видалити поїздку з історії
 */
router.delete('/history/:tripId', authenticate, async (req, res, next) => {
    try {
        const trip = await UserTrip.findOneAndDelete({
            _id: req.params.tripId,
            userId: req.user._id
        });

        if (!trip) {
            return res.status(404).json({
                success: false,
                error: 'Trip not found'
            });
        }

        res.json({
            success: true,
            message: 'Trip deleted successfully'
        });

    } catch (error) {
        console.error('Delete trip error:', error);
        next(error);
    }
});

module.exports = router;