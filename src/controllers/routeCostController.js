// src/controllers/routeCostController.js
const routeCostService = require('../services/routeCostService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const logger = require('../utils/logger');

class RouteCostController {

    /**
     * POST /api/route-cost/calculate
     * Body: { start: {lat, lng}, end: {lat, lng}, vehicleType: "2AxlesAuto" }
     */
    async calculateByCoordinates(req, res, next) {
        try {
            const { start, end, vehicleType } = req.body;

            // Validation
            if (!start || !end) {
                return errorResponse(res, 'Missing required fields: start, end', 400);
            }

            if (!start.lat || !start.lng || !end.lat || !end.lng) {
                return errorResponse(res, 'Invalid coordinates format. Required: {lat: number, lng: number}', 400);
            }

            logger.info('Route cost calculation request (coordinates)', {
                requestId: res.locals.requestId,
                start: `${start.lat},${start.lng}`,
                end: `${end.lat},${end.lng}`,
                vehicleType: vehicleType || '2AxlesAuto'
            });

            const result = await routeCostService.calculateRouteCost(
                start,
                end,
                vehicleType || '2AxlesAuto'
            );

            return successResponse(res, result, {
                distanceKm: result.route.distanceKm,
                tollCost: result.tolls.totalCost
            });

        } catch (error) {
            logger.error('Route cost calculation failed', {
                requestId: res.locals.requestId,
                error: error.message
            });
            next(error);
        }
    }

    /**
     * POST /api/route-cost/calculate-from-address
     * Body: { startAddress: "Milan, Italy", endAddress: "Rome, Italy", vehicleType: "2AxlesAuto" }
     */
    async calculateByAddress(req, res, next) {
        try {
            const { startAddress, endAddress, vehicleType } = req.body;

            // Validation
            if (!startAddress || !endAddress) {
                return errorResponse(res, 'Missing required fields: startAddress, endAddress', 400);
            }

            logger.info('Route cost calculation request (addresses)', {
                requestId: res.locals.requestId,
                startAddress,
                endAddress,
                vehicleType: vehicleType || '2AxlesAuto'
            });

            const result = await routeCostService.calculateRouteCostFromAddress(
                startAddress,
                endAddress,
                vehicleType || '2AxlesAuto'
            );

            return successResponse(res, result, {
                distanceKm: result.route.distanceKm,
                tollCost: result.tolls.totalCost
            });

        } catch (error) {
            logger.error('Route cost calculation from address failed', {
                requestId: res.locals.requestId,
                error: error.message
            });
            next(error);
        }
    }
}

module.exports = new RouteCostController();