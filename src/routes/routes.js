// src/routes/routes.js
const express = require('express');
const router = express.Router();
const { optionalAuth, authenticate } = require('../middleware/authenticate');
const routeService = require('../services/routeService');
const costService = require('../services/costService');
const UserTrip = require('../models/UserTrip');
const googleMapsParser = require('../utils/googleMapsParser');

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
 */
router.get('/history', authenticate, async (req, res, next) => {
    try {
        const { limit = 20, skip = 0 } = req.query;

        const trips = await UserTrip.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .populate('vehicleId', 'name fuelType consumption');

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
 */
router.get('/history/:tripId', authenticate, async (req, res, next) => {
    try {
        const trip = await UserTrip.findOne({
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
        next(error);
    }
});

/**
 * DELETE /api/routes/history/:tripId
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

/**
 * POST /api/routes/import-google
 * Імпорт маршруту з Google Maps URL
 *
 * Body: {
 *   googleMapsUrl: string,
 *   vehicleId: string
 * }
 *
 * Підтримує:
 * - Short URLs: https://maps.app.goo.gl/xxx
 * - Full URLs: https://www.google.com/maps/dir/...
 */
router.post('/import-google', optionalAuth, async (req, res) => {
    try {
        const { googleMapsUrl, vehicleId } = req.body;

        // Validation
        if (!googleMapsUrl || !vehicleId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: googleMapsUrl, vehicleId'
            });
        }

        // Валідація URL
        if (!googleMapsUrl.includes('google.com/maps') && !googleMapsUrl.includes('goo.gl')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Google Maps URL'
            });
        }

        console.log('=== Import from Google Maps ===');
        console.log('URL:', googleMapsUrl);
        console.log('Vehicle ID:', vehicleId);

        // Парсити URL та геокодувати якщо потрібно
        const parsed = await googleMapsParser.parseAndGeocode(googleMapsUrl);

        console.log('Parsed coordinates:');
        console.log('Origin:', parsed.origin);
        console.log('Destination:', parsed.destination);
        console.log('Waypoints:', parsed.waypoints);

        // Викликати стандартний calculateTripCost з отриманими координатами
        const result = await costService.calculateTripCost(
            parsed.origin,
            parsed.destination,
            vehicleId,
            parsed.waypoints
        );

        // Якщо користувач залогінений - зберегти trip
        if (req.user) {
            try {
                const trip = new UserTrip({
                    userId: req.user._id,
                    vehicleId: vehicleId,
                    origin: parsed.origin.originalName || result.route?.origin || 'Unknown',
                    destination: parsed.destination.originalName || result.route?.destination || 'Unknown',
                    originCoords: {
                        lat: parsed.origin.lat,
                        lon: parsed.origin.lon
                    },
                    destinationCoords: {
                        lat: parsed.destination.lat,
                        lon: parsed.destination.lon
                    },
                    waypoints: parsed.waypoints || [],
                    distance: result.route?.distance,
                    duration: result.route?.duration,
                    fuelCost: result.fuelCost,
                    tollCost: result.tollCost,
                    totalCost: result.totalCost,
                    countries: result.countries,
                    // Зберегти оригінальний Google Maps URL
                    googleMapsUrl: googleMapsUrl
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
            savedToHistory: !!req.user,
            importedFrom: 'google-maps',
            parsedLocations: {
                origin: parsed.origin.originalName || null,
                destination: parsed.destination.originalName || null,
                waypoints: parsed.waypoints?.map(wp => wp.originalName).filter(Boolean) || []
            }
        });

    } catch (error) {
        console.error('Google Maps import error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to import route from Google Maps',
            details: error.message
        });
    }
});


module.exports = router;