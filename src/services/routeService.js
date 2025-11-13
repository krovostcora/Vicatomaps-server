const axios = require('axios');
const polyline = require('@mapbox/polyline');

const GOOGLE_ROUTES_API_KEY = process.env.GOOGLE_ROUTES_API_KEY;
const GOOGLE_ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

class RouteService {
    async getRoutes({ origin, destination, waypoints = [], alternatives = true }) {
        console.log('\n========== NEW ROUTE REQUEST ==========');
        const requestBody = {
            origin: this.buildWaypoint(origin),
            destination: this.buildWaypoint(destination),
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

        if (waypoints.length > 0) {
            requestBody.intermediates = waypoints.map(wp => this.buildWaypoint(wp));
        }

        const response = await axios.post(GOOGLE_ROUTES_URL, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': GOOGLE_ROUTES_API_KEY,
                'X-Goog-FieldMask':
                    'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs,routes.travelAdvisory,routes.travelAdvisory.tollInfo'
            }
        });

        console.log('✅ Google Routes API response received');

        const parsed = this.parseRoutesResponse(response.data);

        // Detect countries for each route
        for (const route of parsed) {
            route.countries = await this.detectCountriesFromPolyline(route.polyline);
        }

        return parsed;
    }

    parseRoutesResponse(data) {
        if (!data.routes || data.routes.length === 0) throw new Error('No routes found');

        return data.routes.map((route, index) => ({
            routeIndex: index,
            distance: (route.distanceMeters || 0) / 1000,
            duration: this.parseDuration(route.duration),
            polyline: route.polyline?.encodedPolyline || '',
            legs: route.legs || [],
            tollInfo: route.travelAdvisory?.tollInfo || {}
        }));
    }

    parseDuration(durationString) {
        return durationString ? parseInt(durationString.replace('s', '')) : 0;
    }

    buildWaypoint(value) {
        if (!value) return null;
        if (value.lat !== undefined && value.lon !== undefined)
            return { location: { latLng: { latitude: value.lat, longitude: value.lon } } };
        if (typeof value === 'string') return { address: value };
        return { address: String(value) };
    }

    async detectCountriesFromPolyline(encodedPolyline) {
        if (!encodedPolyline) return [];

        const points = polyline.decode(encodedPolyline);
        if (points.length === 0) return [];

        // sample every ~200th point to reduce API load
        const sampled = points.filter((_, i) => i % 200 === 0);

        const countries = new Set();
        for (const [lat, lon] of sampled) {
            try {
                const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${process.env.GOOGLE_ROUTES_API_KEY}&result_type=country`;
                const res = await axios.get(url);
                const country = res.data?.results?.[0]?.address_components?.[0]?.short_name;
                if (country) countries.add(country);
            } catch (err) {
                console.warn('Reverse geocode failed for point:', lat, lon);
            }
        }

        return Array.from(countries);
    }
}

module.exports = new RouteService();
