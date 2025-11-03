// src/services/mapboxService.js
const axios = require('axios');
const logger = require('../utils/logger');

class MapboxService {

    /**
     * Геокодування - перетворення адреси в координати
     * @param {String} query - Адреса або місце для пошуку
     * @returns {Object} Координати та інформація про місце
     */
    async geocode(query) {
        try {
            if (!query || query.trim() === '') {
                throw new Error('Query cannot be empty');
            }

            logger.info('Geocoding request', { query });

            const response = await axios.get(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
                {
                    params: {
                        access_token: process.env.MAPBOX_ACCESS_TOKEN
                    },
                    timeout: 10000
                }
            );

            if (response.data.features && response.data.features.length > 0) {
                const feature = response.data.features[0];
                const coords = feature.geometry.coordinates;

                logger.info('Geocoding successful', {
                    query,
                    result: feature.place_name
                });

                return {
                    coordinates: {
                        lng: coords[0],
                        lat: coords[1]
                    },
                    place_name: feature.place_name,
                    features: response.data.features
                };
            }

            logger.warn('Geocoding returned no results', { query });
            return null;

        } catch (error) {
            logger.error('Geocoding failed', {
                query,
                error: error.message
            });
            throw new Error(`Geocoding failed: ${error.message}`);
        }
    }

    /**
     * Розрахунок маршруту між двома точками
     * @param {Object} start - Початкова точка {lat, lng}
     * @param {Object} end - Кінцева точка {lat, lng}
     * @returns {Object} Інформація про маршрут
     */
    async calculateRoute(start, end) {
        try {
            if (!this._validateCoordinates(start) || !this._validateCoordinates(end)) {
                throw new Error('Invalid coordinates provided');
            }

            logger.info('Route calculation request', {
                start: `${start.lat},${start.lng}`,
                end: `${end.lat},${end.lng}`
            });

            const response = await axios.get(
                `https://api.mapbox.com/directions/v5/mapbox/driving/${start.lng},${start.lat};${end.lng},${end.lat}`,
                {
                    params: {
                        access_token: process.env.MAPBOX_ACCESS_TOKEN,
                        geometries: 'geojson',
                        overview: 'full',
                        steps: 'true',
                        annotations: 'distance,duration'
                    },
                    timeout: 15000
                }
            );

            if (response.data.routes && response.data.routes.length > 0) {
                const route = response.data.routes[0];

                const result = {
                    coordinates: route.geometry.coordinates,
                    distance: route.distance, // в метрах
                    duration: route.duration, // в секундах
                    steps: route.legs[0]?.steps || [],
                    distanceKm: (route.distance / 1000).toFixed(2),
                    durationMinutes: (route.duration / 60).toFixed(0)
                };

                logger.info('Route calculation successful', {
                    distanceKm: result.distanceKm,
                    durationMinutes: result.durationMinutes
                });

                return result;
            }

            logger.warn('Route calculation returned no routes');
            return null;

        } catch (error) {
            logger.error('Route calculation failed', {
                error: error.message
            });
            throw new Error(`Route calculation failed: ${error.message}`);
        }
    }

    /**
     * Валідація координат
     * @private
     */
    _validateCoordinates(coords) {
        if (!coords || typeof coords !== 'object') {
            return false;
        }

        const { lat, lng } = coords;

        if (typeof lat !== 'number' || typeof lng !== 'number') {
            return false;
        }

        if (lat < -90 || lat > 90) {
            return false;
        }

        if (lng < -180 || lng > 180) {
            return false;
        }

        return true;
    }
}

module.exports = new MapboxService();