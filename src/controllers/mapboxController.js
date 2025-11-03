// src/controllers/mapboxController.js
const mapboxService = require('../services/mapboxService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const logger = require('../utils/logger');

class MapboxController {

    /**
     * POST /api/geocode
     * Геокодування адреси
     */
    async geocode(req, res, next) {
        try {
            const { query } = req.validatedBody || req.body;

            logger.info('Geocode request received', {
                requestId: res.locals.requestId,
                query: query
            });

            const result = await mapboxService.geocode(query);

            if (!result) {
                return successResponse(res, {
                    found: false,
                    message: 'No results found for the given query'
                });
            }

            return successResponse(res, result);

        } catch (error) {
            logger.error('Geocode request failed', {
                requestId: res.locals.requestId,
                error: error.message
            });

            next(error);
        }
    }

    /**
     * POST /api/route
     * Розрахунок маршруту
     */
    async calculateRoute(req, res, next) {
        try {
            const { start, end } = req.validatedBody || req.body;

            logger.info('Route calculation request received', {
                requestId: res.locals.requestId,
                start: `${start.lat},${start.lng}`,
                end: `${end.lat},${end.lng}`
            });

            const route = await mapboxService.calculateRoute(start, end);

            if (!route) {
                return successResponse(res, {
                    found: false,
                    message: 'No route found between the given points'
                });
            }

            return successResponse(res, {
                route: route
            }, {
                distanceKm: route.distanceKm,
                durationMinutes: route.durationMinutes
            });

        } catch (error) {
            logger.error('Route calculation failed', {
                requestId: res.locals.requestId,
                error: error.message
            });

            next(error);
        }
    }
}

module.exports = new MapboxController();