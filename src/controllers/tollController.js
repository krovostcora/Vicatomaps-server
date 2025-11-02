// src/controllers/tollController.js
const tollService = require('../services/tollService');
const { successResponse, errorResponse } = require('../utils/responseFormatter');
const logger = require('../utils/logger');

/**
 * TOLL CONTROLLER
 * Thin layer - тільки обробка req/res, вся логіка в service
 */
class TollController {

    /**
     * POST /api/tolls/calculate
     * Розрахувати вартість платних доріг для маршруту
     */
    async calculateTolls(req, res, next) {
        const startTime = Date.now();

        try {
            // 1. Отримати валідовані дані (валідація в middleware)
            const { route, vehicleType } = req.validatedBody;

            logger.info('Toll calculation request received', {
                requestId: res.locals.requestId,
                routePoints: route.length,
                vehicleType: vehicleType
            });

            // 2. Викликати service
            const result = await tollService.calculateTolls(route, vehicleType);

            // 3. Логувати результат
            const duration = Date.now() - startTime;
            logger.info('Toll calculation completed', {
                requestId: res.locals.requestId,
                duration: `${duration}ms`,
                totalCost: result.totalCost,
                tollCount: result.tollCount,
                isEstimated: result.isEstimated
            });

            // 4. Повернути успішну відповідь
            return successResponse(res, result, {
                duration: `${duration}ms`,
                cached: result.fromCache || false
            });

        } catch (error) {
            // 5. Передати помилку в error handler middleware
            logger.error('Toll calculation failed', {
                requestId: res.locals.requestId,
                error: error.message,
                stack: error.stack
            });

            next(error);
        }
    }

    /**
     * GET /api/tolls/country/:countryCode
     * Отримати всі платні дороги в країні
     */
    async getTollsByCountry(req, res, next) {
        try {
            const { countryCode } = req.params;
            const { roadType, active } = req.query;

            logger.info('Get tolls by country request', {
                requestId: res.locals.requestId,
                countryCode: countryCode
            });

            // Виклик service
            const tolls = await tollService.getTollsByCountry(countryCode, {
                roadType: roadType,
                active: active !== 'false' // За замовчуванням тільки активні
            });

            return successResponse(res, {
                country: countryCode.toUpperCase(),
                count: tolls.length,
                tolls: tolls
            });

        } catch (error) {
            logger.error('Get tolls by country failed', {
                requestId: res.locals.requestId,
                error: error.message
            });

            next(error);
        }
    }

    /**
     * GET /api/tolls/stats/:countryCode
     * Отримати статистику по країні
     */
    async getCountryStats(req, res, next) {
        try {
            const { countryCode } = req.params;

            logger.info('Get country stats request', {
                requestId: res.locals.requestId,
                countryCode: countryCode
            });

            const stats = await tollService.getCountryStats(countryCode);

            return successResponse(res, stats);

        } catch (error) {
            logger.error('Get country stats failed', {
                requestId: res.locals.requestId,
                error: error.message
            });

            next(error);
        }
    }

    /**
     * GET /api/tolls/:id
     * Отримати деталі конкретної дороги
     */
    async getTollById(req, res, next) {
        try {
            const { id } = req.params;

            logger.info('Get toll by ID request', {
                requestId: res.locals.requestId,
                tollId: id
            });

            const toll = await tollService.getTollById(id);

            if (!toll) {
                return errorResponse(res,
                    { message: 'Toll road not found', name: 'NotFoundError' },
                    404
                );
            }

            return successResponse(res, toll);

        } catch (error) {
            logger.error('Get toll by ID failed', {
                requestId: res.locals.requestId,
                error: error.message
            });

            next(error);
        }
    }

    /**
     * POST /api/tolls/estimate
     * Швидкий estimate без geospatial query (якщо MongoDB недоступний)
     */
    async estimateTolls(req, res, next) {
        try {
            const { route, vehicleType } = req.validatedBody;

            logger.info('Toll estimation request', {
                requestId: res.locals.requestId,
                routePoints: route.length
            });

            const estimate = await tollService.estimateTollsOnly(route, vehicleType);

            return successResponse(res, {
                ...estimate,
                isEstimated: true,
                note: 'This is a rough estimate based on country rates'
            });

        } catch (error) {
            logger.error('Toll estimation failed', {
                requestId: res.locals.requestId,
                error: error.message
            });

            next(error);
        }
    }

    /**
     * DELETE /api/tolls/cache
     * Очистити кеш toll розрахунків (admin only)
     */
    async clearCache(req, res, next) {
        try {
            logger.warn('Toll cache clear requested', {
                requestId: res.locals.requestId
            });

            const result = await tollService.clearCache();

            return successResponse(res, {
                message: 'Toll cache cleared successfully',
                keysDeleted: result
            });

        } catch (error) {
            logger.error('Clear cache failed', {
                requestId: res.locals.requestId,
                error: error.message
            });

            next(error);
        }
    }
}

// Експортуємо instance класу
module.exports = new TollController();