// services/routeService.js
const axios = require('axios');

const GOOGLE_ROUTES_API_KEY = process.env.GOOGLE_ROUTES_API_KEY;
const GOOGLE_ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

/**
 * Build waypoint object for Google Routes API
 * Supports: {lat, lon}, "address string", {address: "..."}
 */
function buildWaypoint(value) {
    if (!value) return null;

    // Format 1: {lat, lon}
    if (value.lat !== undefined && value.lon !== undefined) {
        return {
            location: {
                latLng: {
                    latitude: value.lat,
                    longitude: value.lon
                }
            }
        };
    }

    // Format 2: {latitude, longitude}
    if (value.latitude !== undefined && value.longitude !== undefined) {
        return {
            location: {
                latLng: {
                    latitude: value.latitude,
                    longitude: value.longitude
                }
            }
        };
    }

    // Format 3: string address
    if (typeof value === 'string') {
        return { address: value };
    }

    // Format 4: {address: "..."}
    if (value.address) {
        return { address: value.address };
    }

    // Default: treat as address string
    return { address: String(value) };
}

class RouteService {
    /**
     * Get route alternatives from Google Routes API
     */
    async getRoutes({ origin, destination, waypoints = [], alternatives = true }) {
        try {
            console.log('\n========== NEW ROUTE REQUEST ==========');
            console.log('Origin:', origin);
            console.log('Destination:', destination);
            console.log('Waypoints:', waypoints);

            const requestBody = {
                origin: buildWaypoint(origin),
                destination: buildWaypoint(destination),
                travelMode: 'DRIVE',
                routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
                extraComputations: ['TOLLS'],
                computeAlternativeRoutes: alternatives,
                routeModifiers: {
                    avoidTolls: false,
                    avoidHighways: false,
                    avoidFerries: false,
                    vehicleInfo: { emissionType: 'GASOLINE' }
                },
                languageCode: 'en-US',
                units: 'METRIC'
            };

            // Add waypoints if provided
            if (waypoints.length > 0) {
                requestBody.intermediates = waypoints.map(wp => buildWaypoint(wp));
            }

            console.log('Request body:', JSON.stringify(requestBody, null, 2));

            const response = await axios.post(GOOGLE_ROUTES_URL, requestBody, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': GOOGLE_ROUTES_API_KEY,
                    'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs,routes.travelAdvisory,routes.travelAdvisory.tollInfo,routes.legs.travelAdvisory.tollInfo'
                }
            });

            console.log('✅ Google Routes API response received');

            return this.parseRoutesResponse(response.data);

        } catch (error) {
            console.error('❌ Error fetching routes:', error.response?.data || error.message);
            throw new Error('Failed to fetch routes from Google Routes API');
        }
    }

    /**
     * Parse routes response from Google API
     */
    parseRoutesResponse(data) {
        if (!data.routes || data.routes.length === 0) {
            throw new Error('No routes found');
        }

        return data.routes.map((route, index) => {
            const totalDistance = route.distanceMeters || 0;
            const duration = this.parseDuration(route.duration);
            const polyline = route.polyline?.encodedPolyline || '';

            const travelAdvisory = route.travelAdvisory || {};
            const tollInfo = travelAdvisory.tollInfo || {};

            console.log(`Route ${index}: ${(totalDistance/1000).toFixed(2)} km, polyline: ${polyline ? '✅' : '❌'}`);

            return {
                routeIndex: index,
                distance: totalDistance / 1000, // km
                duration: duration,
                polyline: polyline,
                legs: route.legs,
                travelAdvisory: travelAdvisory,
                tollInfo: tollInfo,
            };
        });
    }

    /**
     * Parse duration string (e.g., "3600s" to seconds)
     */
    parseDuration(durationString) {
        if (!durationString) return 0;
        return parseInt(durationString.replace('s', ''));
    }
}

module.exports = new RouteService();