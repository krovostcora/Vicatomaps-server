// services/tollService.js
const TollRoad = require('../models/TollRoad');
const cacheService = require('./cacheService');
const geospatial = require('../utils/geospatial');
const constants = require('../config/constants');
const logger = require('../utils/logger');
const { DatabaseError } = require('../utils/errorTypes');

class TollService {

    /**
     * Розрахунок вартості платних доріг для маршруту
     * @param {Array} route - Масив координат [{lat, lng}, ...]
     * @param {String} vehicleType - Тип транспорту (2AxlesAuto, etc.)
     * @returns {Object} Результат розрахунку
     */
    async calculateTolls(route, vehicleType = '2AxlesAuto') {
        const startTime = Date.now();

        try {
            // 1. Визначити країни на маршруті
            const countries = geospatial.detectCountries(route);
            logger.info('Toll calculation started', {
                routePoints: route.length,
                countries: countries,
                vehicleType: vehicleType
            });

            // 2. Перевірити кеш (для популярних маршрутів)
            const cacheKey = this._generateCacheKey(route, vehicleType);
            const cached = await cacheService.get(cacheKey);

            if (cached) {
                logger.info('Toll calculation from cache', { cacheKey });
                return { ...cached, fromCache: true };
            }

            // 3. Шукати toll roads в MongoDB
            const dbTolls = await this._findTollRoadsInDB(route, countries, vehicleType);

            // 4. Додати віньєтки
            const vignettes = this._calculateVignettes(countries, vehicleType);

            // 5. Комбінувати результати
            const allTolls = [...dbTolls, ...vignettes];
            const totalCost = allTolls.reduce((sum, toll) => sum + toll.cost, 0);

            // 6. Якщо нічого не знайшли → estimates
            let isEstimated = false;
            if (allTolls.length === 0) {
                const estimates = this._estimateTollCost(route, countries);
                allTolls.push(...estimates);
                isEstimated = true;
            }

            const result = {
                totalCost: parseFloat(totalCost.toFixed(2)),
                currency: 'EUR',
                tollCount: allTolls.length,
                tolls: allTolls,
                isEstimated: isEstimated,
                countries: countries
            };

            // 7. Зберегти в кеш
            await cacheService.set(
                cacheKey,
                result,
                constants.CACHE.TOLL_ROUTES
            );

            const duration = Date.now() - startTime;
            logger.info('Toll calculation completed', {
                duration: `${duration}ms`,
                totalCost: result.totalCost,
                tollCount: result.tollCount,
                isEstimated: isEstimated
            });

            return result;

        } catch (error) {
            logger.error('Toll calculation failed', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Шукати toll roads в MongoDB
     * @private
     */
    async _findTollRoadsInDB(route, countries, vehicleType) {
        try {
            // Створити GeoJSON LineString
            const routeLine = {
                type: 'LineString',
                coordinates: route.map(p => [p.lng, p.lat])
            };

            // Geospatial query
            const tollRoads = await TollRoad.find({
                geometry: {
                    $geoIntersects: {
                        $geometry: routeLine
                    }
                },
                country: { $in: countries },
                active: true
            })
                .lean()
                .select('name country pricing category lengthKm roadNumber')
                .exec();

            logger.info('MongoDB query completed', {
                foundRoads: tollRoads.length
            });

            // Мапити на формат відповіді
            const vehicleClass = constants.VEHICLE_TYPES[vehicleType] || 'car';

            return tollRoads.map(road => {
                const pricing = road.pricing.find(p => p.vehicleClass === vehicleClass);

                if (!pricing) {
                    logger.warn('No pricing for vehicle type', {
                        road: road.name,
                        vehicleClass
                    });
                    return null;
                }

                // Конвертувати в EUR якщо треба
                let cost = pricing.price;
                if (pricing.currency !== 'EUR') {
                    const rate = constants.CURRENCY_RATES[`${pricing.currency}_TO_EUR`];
                    if (rate) {
                        cost = cost * rate;
                        logger.debug('Currency converted', {
                            from: pricing.currency,
                            to: 'EUR',
                            originalPrice: pricing.price,
                            convertedPrice: cost
                        });
                    }
                }

                return {
                    name: road.name,
                    cost: parseFloat(cost.toFixed(2)),
                    currency: 'EUR',
                    source: 'database',
                    roadNumber: road.roadNumber,
                    country: road.country,
                    category: road.category
                };
            }).filter(Boolean); // Видалити null

        } catch (error) {
            throw new DatabaseError(
                'Failed to query toll roads from database',
                'TollRoad.find'
            );
        }
    }

    /**
     * Розрахувати вартість віньєток
     * @private
     */
    _calculateVignettes(countries, vehicleType) {
        const vignettes = [];
        const vignetteCountries = Object.keys(constants.VIGNETTES);

        for (const country of countries) {
            if (vignetteCountries.includes(country)) {
                // За замовчуванням 10-денна віньєтка
                const price = constants.VIGNETTES[country]['10_days'] ||
                    constants.VIGNETTES[country]['7_days'] ||
                    constants.VIGNETTES[country]['1_year'];

                vignettes.push({
                    name: `${country} Vignette (10 days)`,
                    cost: price,
                    currency: 'EUR',
                    source: 'vignette',
                    country: country,
                    type: 'vignette'
                });
            }
        }

        return vignettes;
    }

    /**
     * Estimates для маршруту (fallback)
     * @private
     */
    _estimateTollCost(route, countries) {
        const distance = geospatial.calculateDistance(route);
        const estimates = [];

        for (const country of countries) {
            const rate = constants.ESTIMATED_TOLL_RATES[country] || 5.0;

            if (rate > 0) {
                // Припускаємо 60% дистанції на платних автострадах
                const estimatedTollKm = distance * 0.6;
                const cost = (estimatedTollKm / 100) * rate;

                estimates.push({
                    name: `${country} highways (estimated)`,
                    cost: parseFloat(cost.toFixed(2)),
                    currency: 'EUR',
                    source: 'estimated',
                    country: country
                });
            }
        }

        return estimates;
    }

    /**
     * Генерувати ключ кешу
     * @private
     */
    _generateCacheKey(route, vehicleType) {
        const start = `${route[0].lat.toFixed(4)},${route[0].lng.toFixed(4)}`;
        const end = `${route[route.length-1].lat.toFixed(4)},${route[route.length-1].lng.toFixed(4)}`;
        return `toll:${start}_${end}_${vehicleType}`;
    }
}

module.exports = new TollService();