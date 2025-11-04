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

            // 2. Перевірити кеш
            const cacheKey = this._generateCacheKey(route, vehicleType);
            const cached = await cacheService.get(cacheKey);

            if (cached) {
                logger.info('Toll calculation from cache', { cacheKey });
                return { ...cached, fromCache: true };
            }

            // 3. Шукати toll roads в MongoDB (НОВИЙ АЛГОРИТМ)
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
     * Шукати toll roads в MongoDB - ВИПРАВЛЕНИЙ МЕТОД
     * @private
     */
    async _findTollRoadsInDB(route, countries, vehicleType) {
        try {
            const vehicleClass = constants.VEHICLE_TYPES[vehicleType] || 'car';

            // СТРАТЕГІЯ 1: Спробувати geospatial query з розширеним buffer
            const routeLine = {
                type: 'LineString',
                coordinates: route.map(p => [p.lng, p.lat])
            };

            let tollRoads = await TollRoad.find({
                geometry: {
                    $geoIntersects: {
                        $geometry: routeLine
                    }
                },
                country: { $in: countries },
                active: true
            })
                .lean()
                .select('name country pricing category lengthKm roadNumber operator geometry')
                .exec();

            logger.info('Geospatial query result', {
                foundRoads: tollRoads.length
            });
// ✳️  після того, як отримали tollRoads з бази
            const routeCoords = routeLine.coordinates;

// Функція для швидкої евклідової (грубого радіуса) відстані між точками
            function distanceKm(a, b) {
                const dx = a[0] - b[0];
                const dy = a[1] - b[1];
                return Math.sqrt(dx * dx + dy * dy) * 111; // приблизно км
            }

            // після const tollRoads = await TollRoad.find(...);
            const filtered = tollRoads.filter(road => {
                const coords = road.geometry?.coordinates;
                if (!coords || coords.length < 2) return false;
                const mid = coords[Math.floor(coords.length / 2)];

                // беремо відстань від середини дороги до середини маршруту
                const routeMid = routeLine.coordinates[Math.floor(routeLine.coordinates.length / 2)];
                const dx = mid[0] - routeMid[0];
                const dy = mid[1] - routeMid[1];
                const distKm = Math.sqrt(dx * dx + dy * dy) * 111;

                // тепер замість 60 робимо 40 км
                return distKm < 60;
            });


            tollRoads.length = 0;
            tollRoads.push(...filtered);

            // СТРАТЕГІЯ 2: Якщо знайшли дороги - шукати ВСІ сегменти тих же доріг
            if (tollRoads.length > 0) {
                // Отримати унікальні номери доріг
                const roadNumbers = [...new Set(tollRoads.map(r => r.roadNumber))];

                logger.info('Found road numbers', { roadNumbers });

                // Знайти ВСІ сегменти цих доріг в країнах маршруту
                const allSegments = await TollRoad.find({
                    roadNumber: { $in: roadNumbers },
                    country: { $in: countries },
                    active: true
                })
                    .lean()
                    .select('name country pricing category lengthKm roadNumber operator geometry')
                    .sort({ roadNumber: 1, name: 1 }) // Сортувати по дорозі та назві
                    .exec();

                logger.info('Found all segments for roads', {
                    totalSegments: allSegments.length,
                    roadNumbers: roadNumbers
                });

                // Фільтрувати сегменти які насправді на маршруті
                tollRoads = this._filterRelevantSegments(allSegments, route, countries);

                logger.info('Filtered relevant segments', {
                    relevantSegments: tollRoads.length
                });
            }

            // СТРАТЕГІЯ 3: Якщо все ще нічого - пошук по bounding box
            if (tollRoads.length === 0) {
                tollRoads = await this._findByBoundingBox(route, countries);
            }

            // Мапити на формат відповіді
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
                    }
                }

                return {
                    name: road.name,
                    cost: parseFloat(cost.toFixed(2)),
                    currency: 'EUR',
                    source: 'database',
                    roadNumber: road.roadNumber,
                    country: road.country,
                    operator: road.operator || null
                };
            }).filter(Boolean);

        } catch (error) {
            logger.error('Database query failed', { error: error.message });
            throw new DatabaseError(
                'Failed to query toll roads from database',
                'TollRoad.find'
            );
        }
    }

    /**
     * Фільтрувати релевантні сегменти на основі геометрії маршруту
     * @private
     */
    _filterRelevantSegments(segments, route, countries) {
        // Отримати bounding box маршруту з невеликим padding
        const lats = route.map(p => p.lat);
        const lngs = route.map(p => p.lng);

        const minLat = Math.min(...lats) - 0.5; // ~50км padding
        const maxLat = Math.max(...lats) + 0.5;
        const minLng = Math.min(...lngs) - 0.5;
        const maxLng = Math.max(...lngs) + 0.5;

        logger.debug('Route bounding box', {
            minLat, maxLat, minLng, maxLng
        });

        // Фільтрувати сегменти які потрапляють в bounding box
        return segments.filter(segment => {
            const coords = segment.geometry.coordinates;

            // Перевірити чи хоча б одна точка сегмента в bounding box
            return coords.some(coord => {
                const [lng, lat] = coord;
                return lat >= minLat && lat <= maxLat &&
                    lng >= minLng && lng <= maxLng;
            });
        });
    }

    /**
     * Пошук по bounding box як fallback
     * @private
     */
    async _findByBoundingBox(route, countries) {
        const lats = route.map(p => p.lat);
        const lngs = route.map(p => p.lng);

        const minLat = Math.min(...lats) - 0.2;
        const maxLat = Math.max(...lats) + 0.2;
        const minLng = Math.min(...lngs) - 0.2;
        const maxLng = Math.max(...lngs) + 0.2;

        logger.info('Using bounding box search', {
            bbox: { minLat, maxLat, minLng, maxLng }
        });

        const roads = await TollRoad.find({
            country: { $in: countries },
            active: true,
            'geometry.coordinates': {
                $geoWithin: {
                    $box: [
                        [minLng, minLat],
                        [maxLng, maxLat]
                    ]
                }
            }
        })
            .lean()
            .select('name country pricing category lengthKm roadNumber operator')
            .exec();

        logger.info('Bounding box search result', {
            foundRoads: roads.length
        });

        return roads;
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
        const end = `${route[route.length - 1].lat.toFixed(4)},${route[route.length - 1].lng.toFixed(4)}`;
        return `toll:${start}_${end}_${vehicleType}`;
    }

    /**
     * Отримати всі дороги в країні
     */
    async getTollsByCountry(countryCode, options = {}) {
        try {
            const query = {
                country: countryCode.toUpperCase(),
            };
            if (options.active !== undefined) {
                query.active = options.active;
            }
            if (options.roadType) {
                query.roadType = options.roadType;
            }

            const tolls = await TollRoad.find(query)
                .select('name country roadType roadNumber lengthKm pricing operator active')
                .lean();

            return tolls;
        } catch (error) {
            throw new DatabaseError(
                `Failed to fetch toll roads for country ${countryCode}`,
                'TollService.getTollsByCountry'
            );
        }
    }

    /**
     * Отримати статистику по країні
     */
    async getCountryStats(countryCode) {
        try {
            const stats = await TollRoad.aggregate([
                {
                    $match: {
                        country: countryCode.toUpperCase(),
                        active: true
                    }
                },
                {
                    $group: {
                        _id: '$roadNumber',
                        count: { $sum: 1 },
                        totalLength: { $sum: '$lengthKm' },
                        avgPrice: { $avg: '$pricing.price' }
                    }
                },
                {
                    $sort: { _id: 1 }
                }
            ]);

            return {
                country: countryCode.toUpperCase(),
                roadCount: stats.length,
                stats: stats
            };
        } catch (error) {
            throw new DatabaseError(
                `Failed to get stats for country ${countryCode}`,
                'TollService.getCountryStats'
            );
        }
    }

    /**
     * Отримати toll road by ID
     */
    async getTollById(id) {
        try {
            const toll = await TollRoad.findById(id).lean();
            return toll;
        } catch (error) {
            throw new DatabaseError(
                'Failed to get toll road by ID',
                'TollService.getTollById'
            );
        }
    }

    /**
     * Estimate only (без geospatial)
     */
    async estimateTollsOnly(route, vehicleType) {
        const countries = geospatial.detectCountries(route);
        const estimates = this._estimateTollCost(route, countries);
        const vignettes = this._calculateVignettes(countries, vehicleType);

        const allTolls = [...estimates, ...vignettes];
        const totalCost = allTolls.reduce((sum, toll) => sum + toll.cost, 0);

        return {
            totalCost: parseFloat(totalCost.toFixed(2)),
            currency: 'EUR',
            tollCount: allTolls.length,
            tolls: allTolls,
            isEstimated: true,
            countries: countries
        };
    }

    /**
     * Очистити кеш
     */
    async clearCache() {
        const pattern = 'toll:*';
        const keys = await cacheService.keys(pattern);

        for (const key of keys) {
            await cacheService.del(key);
        }

        return keys.length;
    }
}

module.exports = new TollService();