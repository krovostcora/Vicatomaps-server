// src/services/routeCostService.js
const mapboxService = require('./mapboxService');
const tollService = require('./tollService');
const logger = require('../utils/logger');

class RouteCostService {

    /**
     * Розрахувати повну вартість маршруту (Mapbox route + tolls)
     * @param {Object} start - {lat, lng}
     * @param {Object} end - {lat, lng}
     * @param {String} vehicleType - '2AxlesAuto', '3AxlesAuto', etc.
     * @returns {Object} Повна інформація про маршрут і вартість
     */
    async calculateRouteCost(start, end, vehicleType = '2AxlesAuto') {
        const startTime = Date.now();

        try {
            logger.info('Route cost calculation started', {
                start: `${start.lat},${start.lng}`,
                end: `${end.lat},${end.lng}`,
                vehicleType
            });

            // 1. Отримати маршрут з Mapbox
            const mapboxRoute = await mapboxService.calculateRoute(start, end);

            if (!mapboxRoute) {
                throw new Error('No route found between the given points');
            }

            // 2. Конвертувати coordinates з Mapbox в формат для tollService
            // Mapbox повертає масив [lng, lat] для кожної точки
            const routeForTolls = mapboxRoute.coordinates.map(coord => {
                // Якщо це масив [lng, lat]
                if (Array.isArray(coord)) {
                    return {
                        lat: coord[1],
                        lng: coord[0]
                    };
                }
                // Якщо це вже об'єкт {lng, lat}
                return coord;
            });

            logger.info('Mapbox route received', {
                points: routeForTolls.length,
                distanceKm: mapboxRoute.distanceKm,
                durationMin: mapboxRoute.durationMinutes
            });

            // 3. Розрахувати tolls
            const tollsResult = await tollService.calculateTolls(routeForTolls, vehicleType);

            // 4. Скомбінувати результати
            const result = {
                route: {
                    distanceKm: parseFloat(mapboxRoute.distanceKm),
                    distanceMeters: mapboxRoute.distance,
                    durationMinutes: parseInt(mapboxRoute.durationMinutes),
                    durationSeconds: mapboxRoute.duration,
                    coordinates: mapboxRoute.coordinates, // Оригінальні координати з Mapbox
                    geometry: {
                        type: 'LineString',
                        coordinates: mapboxRoute.coordinates
                    }
                },
                tolls: {
                    totalCost: tollsResult.totalCost,
                    currency: tollsResult.currency,
                    count: tollsResult.tollCount,
                    details: tollsResult.tolls,
                    isEstimated: tollsResult.isEstimated,
                    countries: tollsResult.countries
                },
                summary: {
                    distanceKm: parseFloat(mapboxRoute.distanceKm),
                    durationMinutes: parseInt(mapboxRoute.durationMinutes),
                    tollCost: tollsResult.totalCost,
                    currency: 'EUR'
                }
            };

            const duration = Date.now() - startTime;
            logger.info('Route cost calculation completed', {
                duration: `${duration}ms`,
                distanceKm: result.route.distanceKm,
                tollCost: result.tolls.totalCost,
                tollCount: result.tolls.count
            });

            return result;

        } catch (error) {
            logger.error('Route cost calculation failed', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Розрахувати маршрут з geocoding (адреса → координати)
     * @param {String} startAddress - "Milan, Italy"
     * @param {String} endAddress - "Rome, Italy"
     * @param {String} vehicleType
     * @returns {Object}
     */
    async calculateRouteCostFromAddress(startAddress, endAddress, vehicleType = '2AxlesAuto') {
        try {
            logger.info('Route cost from addresses', {
                startAddress,
                endAddress,
                vehicleType
            });

            // 1. Geocode start address
            const startGeo = await mapboxService.geocode(startAddress);
            if (!startGeo) {
                throw new Error(`Could not geocode start address: ${startAddress}`);
            }

            // 2. Geocode end address
            const endGeo = await mapboxService.geocode(endAddress);
            if (!endGeo) {
                throw new Error(`Could not geocode end address: ${endAddress}`);
            }

            // 3. Calculate route
            const result = await this.calculateRouteCost(
                startGeo.coordinates,
                endGeo.coordinates,
                vehicleType
            );

            // 4. Add address info to result
            result.addresses = {
                start: {
                    query: startAddress,
                    placeName: startGeo.place_name,
                    coordinates: startGeo.coordinates
                },
                end: {
                    query: endAddress,
                    placeName: endGeo.place_name,
                    coordinates: endGeo.coordinates
                }
            };

            return result;

        } catch (error) {
            logger.error('Route cost from address failed', {
                error: error.message
            });
            throw error;
        }
    }
}

module.exports = new RouteCostService();