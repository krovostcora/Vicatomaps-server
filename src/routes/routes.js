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
 */
router.post('/calculate', optionalAuth, async (req, res) => {
    try {
        const { origin, destination, waypoints, vehicleId } = req.body;

        if (!origin || !destination || !vehicleId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: origin, destination, vehicleId'
            });
        }

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
                    vehicle: vehicleId, // ✅ ВИПРАВЛЕНО: vehicle замість vehicleId
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
                    waypoints: waypoints?.map(wp => wp.name || `${wp.lat},${wp.lon}`) || [],
                    totalDistance: result.route?.distance || 0, // ✅ ВИПРАВЛЕНО: totalDistance
                    duration: result.route?.duration || 0,
                    fuelCost: result.fuelCost?.total || 0, // ✅ ВИПРАВЛЕНО: .total
                    tollCost: result.tollCost?.total || 0, // ✅ ВИПРАВЛЕНО: .total
                    totalCost: result.totalCost || 0,
                    countries: result.countries || [],
                    // ✅ ДОДАНО: зберегти breakdown
                    fuelBreakdown: result.fuelCost?.breakdown?.map(fb => ({
                        countryCode: fb.countryCode,
                        country: fb.country,
                        pricePerLiter: fb.pricePerLiter,
                        liters: fb.estimatedLiters,
                        cost: fb.cost
                    })) || []
                });

                await trip.save();
                result.tripId = trip._id;
                console.log('✅ Trip saved successfully:', trip._id);
            } catch (saveError) {
                console.error('❌ Failed to save trip:', saveError);
                // Не блокуємо відповідь
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
            .populate('vehicle', 'name fuelType consumption'); // ✅ ВИПРАВЛЕНО: vehicle

        const total = await UserTrip.countDocuments({ userId: req.user._id });

        console.log(`📋 Found ${trips.length} trips for user ${req.user._id}`);

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
        }).populate('vehicle'); // ✅ ВИПРАВЛЕНО: vehicle

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
 */
router.post('/import-google', optionalAuth, async (req, res) => {
    try {
        const { googleMapsUrl, vehicleId } = req.body;

        if (!googleMapsUrl || !vehicleId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: googleMapsUrl, vehicleId'
            });
        }

        if (!googleMapsUrl.includes('google.com/maps') && !googleMapsUrl.includes('goo.gl')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Google Maps URL'
            });
        }

        console.log('=== Import from Google Maps ===');
        console.log('URL:', googleMapsUrl);
        console.log('Vehicle ID:', vehicleId);

        const parsed = await googleMapsParser.parseAndGeocode(googleMapsUrl);

        console.log('Parsed coordinates:');
        console.log('Origin:', parsed.origin);
        console.log('Destination:', parsed.destination);
        console.log('Waypoints:', parsed.waypoints);

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
                    vehicle: vehicleId, // ✅ ВИПРАВЛЕНО: vehicle
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
                    waypoints: parsed.waypoints?.map(wp => wp.originalName || wp.name) || [],
                    totalDistance: result.route?.distance || 0, // ✅ ВИПРАВЛЕНО
                    duration: result.route?.duration || 0,
                    fuelCost: result.fuelCost?.total || 0, // ✅ ВИПРАВЛЕНО
                    tollCost: result.tollCost?.total || 0, // ✅ ВИПРАВЛЕНО
                    totalCost: result.totalCost || 0,
                    countries: result.countries || [],
                    googleMapsUrl: googleMapsUrl,
                    fuelBreakdown: result.fuelCost?.breakdown?.map(fb => ({
                        countryCode: fb.countryCode,
                        country: fb.country,
                        pricePerLiter: fb.pricePerLiter,
                        liters: fb.estimatedLiters,
                        cost: fb.cost
                    })) || []
                });

                await trip.save();
                result.tripId = trip._id;
                console.log('✅ Trip saved successfully:', trip._id);
            } catch (saveError) {
                console.error('❌ Failed to save trip:', saveError);
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