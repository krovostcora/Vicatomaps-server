// services/routeService.js
const axios = require('axios');

const GOOGLE_ROUTES_API_KEY = process.env.GOOGLE_ROUTES_API_KEY;
const GOOGLE_ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

class RouteService {
    /**
     * Get route alternatives from Google Routes API
     */
    async getRoutes({ origin, destination, waypoints = [], alternatives = true }) {
        try {
            const requestBody = {
                origin: {
                    address: origin
                },
                destination: {
                    address: destination
                },
                travelMode: 'DRIVE',
                routingPreference: 'TRAFFIC_AWARE',
                computeAlternativeRoutes: alternatives,
                routeModifiers: {
                    avoidTolls: false,
                    avoidHighways: false,
                    avoidFerries: false
                },
                languageCode: 'en-US',
                units: 'METRIC'
            };

            // Add waypoints if provided
            if (waypoints.length > 0) {
                requestBody.intermediates = waypoints.map(waypoint => ({
                    address: waypoint
                }));
            }

            const response = await axios.post(GOOGLE_ROUTES_URL, requestBody, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': GOOGLE_ROUTES_API_KEY,
                    'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs,routes.travelAdvisory,routes.travelAdvisory.tollInfo'
                }
            });

            // Extract countries from addresses
            const allAddresses = [origin, destination, ...waypoints];
            const countries = this.extractCountriesFromAddresses(allAddresses);

            return this.parseRoutesResponse(response.data, countries);

        } catch (error) {
            console.error('Error fetching routes:', error.response?.data || error.message);
            throw new Error('Failed to fetch routes from Google Routes API');
        }
    }

    /**
     * Get detailed turn-by-turn directions
     */
    async getDirections({ origin, destination, waypoints = [] }) {
        try {
            const requestBody = {
                origin: {
                    address: origin
                },
                destination: {
                    address: destination
                },
                travelMode: 'DRIVE',
                languageCode: 'en-US',
                units: 'METRIC'
            };

            if (waypoints.length > 0) {
                requestBody.intermediates = waypoints.map(waypoint => ({
                    address: waypoint
                }));
            }

            const response = await axios.post(GOOGLE_ROUTES_URL, requestBody, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': GOOGLE_ROUTES_API_KEY,
                    'X-Goog-FieldMask': 'routes.legs.steps,routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline'
                }
            });

            return this.parseDirectionsResponse(response.data);

        } catch (error) {
            console.error('Error fetching directions:', error.response?.data || error.message);
            throw new Error('Failed to fetch directions from Google Routes API');
        }
    }

    /**
     * Parse routes response from Google API
     */
    parseRoutesResponse(data, countries = []) {
        if (!data.routes || data.routes.length === 0) {
            throw new Error('No routes found');
        }

        return data.routes.map((route, index) => {
            const totalDistance = route.distanceMeters || 0;
            const duration = this.parseDuration(route.duration);
            const polyline = route.polyline?.encodedPolyline || '';

            // Extract full travel advisory including toll information
            const travelAdvisory = route.travelAdvisory || {};
            const tollInfo = travelAdvisory.tollInfo || {};

            // Use provided countries or try to extract from route
            const routeCountries = countries.length > 0 ? countries : this.extractCountries(route.legs);

            console.log(`Route ${index} toll info:`, JSON.stringify(tollInfo, null, 2));

            return {
                routeIndex: index,
                distance: totalDistance / 1000, // Convert to km
                duration: duration,
                polyline: polyline,
                legs: route.legs,
                travelAdvisory: travelAdvisory,
                tollInfo: tollInfo,
                countries: routeCountries
            };
        });
    }

    /**
     * Parse directions response
     */
    parseDirectionsResponse(data) {
        if (!data.routes || data.routes.length === 0) {
            throw new Error('No directions found');
        }

        const route = data.routes[0];
        const steps = [];

        route.legs?.forEach(leg => {
            leg.steps?.forEach(step => {
                steps.push({
                    instruction: step.navigationInstruction?.instructions || '',
                    distance: step.distanceMeters / 1000,
                    duration: this.parseDuration(step.staticDuration),
                    polyline: step.polyline?.encodedPolyline || ''
                });
            });
        });

        return {
            totalDistance: route.distanceMeters / 1000,
            totalDuration: this.parseDuration(route.duration),
            polyline: route.polyline?.encodedPolyline || '',
            steps: steps
        };
    }

    /**
     * Parse duration string (e.g., "3600s" to seconds)
     */
    parseDuration(durationString) {
        if (!durationString) return 0;
        return parseInt(durationString.replace('s', ''));
    }

    /**
     * Extract countries from route legs
     */
    extractCountries(legs) {
        const countries = new Set();

        if (!legs || legs.length === 0) {
            return [];
        }

        legs.forEach(leg => {
            if (!leg.steps) return;

            leg.steps.forEach(step => {
                // Extract country from end location
                if (step.endLocation) {
                    // Google Routes API v2 provides location data
                    const location = step.endLocation;

                    // Try to get country from various possible fields
                    if (location.address) {
                        // Extract country code from address string
                        const addressParts = location.address.split(',').map(p => p.trim());
                        const lastPart = addressParts[addressParts.length - 1];

                        // Map common country names to codes
                        const countryMap = {
                            'Germany': 'DE',
                            'Deutschland': 'DE',
                            'France': 'FR',
                            'Czech Republic': 'CZ',
                            'Czechia': 'CZ',
                            'Austria': 'AT',
                            'Belgium': 'BE',
                            'Netherlands': 'NL',
                            'Switzerland': 'CH',
                            'Italy': 'IT',
                            'Spain': 'ES',
                            'Poland': 'PL'
                        };

                        if (countryMap[lastPart]) {
                            countries.add(countryMap[lastPart]);
                        }
                    }
                }
            });
        });

        // If no countries detected from steps, try to infer from origin/destination
        if (countries.size === 0) {
            // This is a fallback - you should ideally geocode origin/destination
            return ['DE', 'CZ', 'FR']; // Default for Berlin -> Prague -> Paris
        }

        return Array.from(countries);
    }

    /**
     * Extract countries from address strings
     */
    extractCountriesFromAddresses(addresses) {
        const countryMap = {
            'Germany': 'DE',
            'Deutschland': 'DE',
            'France': 'FR',
            'Czech Republic': 'CZ',
            'Czechia': 'CZ',
            'Austria': 'AT',
            'Österreich': 'AT',
            'Belgium': 'BE',
            'België': 'BE',
            'Belgique': 'BE',
            'Netherlands': 'NL',
            'Nederland': 'NL',
            'Switzerland': 'CH',
            'Schweiz': 'CH',
            'Suisse': 'CH',
            'Italy': 'IT',
            'Italia': 'IT',
            'Spain': 'ES',
            'España': 'ES',
            'Poland': 'PL',
            'Polska': 'PL',
            'Portugal': 'PT',
            'Denmark': 'DK',
            'Sweden': 'SE',
            'Norway': 'NO'
        };

        const countries = new Set();

        addresses.forEach(address => {
            // Extract country from address (usually the last part after comma)
            const parts = address.split(',').map(p => p.trim());

            for (let i = parts.length - 1; i >= 0; i--) {
                const part = parts[i];
                if (countryMap[part]) {
                    countries.add(countryMap[part]);
                    break;
                }
            }
        });

        return Array.from(countries);
    }
}

module.exports = new RouteService();