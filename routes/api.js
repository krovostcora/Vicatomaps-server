const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

// ============================================
// MAPBOX ROUTES
// ============================================

/**
 * POST /api/geocode
 * Geocode a location query
 */
router.post('/geocode', async (req, res) => {
    try {
        const { query } = req.body;

        if (!query || query.trim() === '') {
            return res.status(400).json({ error: 'Query is required' });
        }

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
            const coords = response.data.features[0].geometry.coordinates;
            res.json({
                success: true,
                coordinates: {
                    lng: coords[0],
                    lat: coords[1]
                },
                place_name: response.data.features[0].place_name,
                features: response.data.features
            });
        } else {
            res.json({
                success: false,
                error: 'No results found'
            });
        }
    } catch (error) {
        console.error('Geocoding error:', error.message);
        res.status(500).json({
            error: 'Geocoding failed',
            details: error.message
        });
    }
});

/**
 * POST /api/route
 * Calculate route between two points
 */
router.post('/route', async (req, res) => {
    try {
        const { start, end } = req.body;

        if (!start || !end || !start.lng || !start.lat || !end.lng || !end.lat) {
            return res.status(400).json({ error: 'Start and end coordinates required' });
        }

        const response = await axios.get(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${start.lng},${start.lat};${end.lng},${end.lat}`,
            {
                params: {
                    access_token: process.env.MAPBOX_ACCESS_TOKEN,
                    geometries: 'geojson',
                    overview: 'full',
                    steps: 'true'
                },
                timeout: 10000
            }
        );

        if (response.data.routes && response.data.routes.length > 0) {
            const route = response.data.routes[0];
            res.json({
                success: true,
                route: {
                    coordinates: route.geometry.coordinates,
                    distance: route.distance,
                    duration: route.duration,
                    steps: route.legs[0]?.steps || []
                }
            });
        } else {
            res.json({
                success: false,
                error: 'No route found'
            });
        }
    } catch (error) {
        console.error('Route calculation error:', error.message);
        res.status(500).json({
            error: 'Route calculation failed',
            details: error.message
        });
    }
});

// ============================================
// TOLLGURU ROUTES
// ============================================

/**
 * POST /api/tolls/calculate
 * Calculate toll costs for a route
 */
router.post('/tolls/calculate', async (req, res) => {
    try {
        const { route, vehicleType = '2AxlesAuto' } = req.body;

        if (!route || !Array.isArray(route) || route.length < 2) {
            return res.status(400).json({ error: 'Valid route coordinates required' });
        }

        // Simplify route (max 20 waypoints)
        const simplifiedWaypoints = simplifyRoute(route, 20);

        const requestBody = {
            source: {
                lat: route[0].lat,
                lng: route[0].lng
            },
            destination: {
                lat: route[route.length - 1].lat,
                lng: route[route.length - 1].lng
            },
            waypoints: simplifiedWaypoints,
            vehicleType: vehicleType,
            units: 'metric'
        };

        const response = await axios.post(
            'https://apis.tollguru.com/toll/v2/origin-destination-waypoints',
            requestBody,
            {
                headers: {
                    'x-api-key': process.env.TOLLGURU_API_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            }
        );

        if (response.data.route) {
            const costs = response.data.route.costs;
            const tolls = response.data.route.tolls || [];

            const tollDetails = tolls.map(toll => ({
                name: toll.name || 'Unknown',
                cost: toll.tagCost || 0,
                currency: toll.currency || 'EUR'
            }));

            res.json({
                success: true,
                totalCost: costs.tag || costs.cash || 0,
                currency: costs.currency || 'EUR',
                tollCount: tollDetails.length,
                tolls: tollDetails,
                isEstimated: false
            });
        } else {
            res.json({
                success: false,
                error: 'No toll data available'
            });
        }
    } catch (error) {
        console.error('TollGuru error:', error.message);

        // Return estimated tolls as fallback
        const estimatedTolls = estimateTollCost(req.body.route);
        res.json({
            success: true,
            ...estimatedTolls,
            isEstimated: true,
            note: 'Using estimated toll costs (API unavailable)'
        });
    }
});

// ============================================
// FUEL PRICE ROUTES
// ============================================

/**
 * GET /api/fuel/prices/:country
 * Get fuel prices for a specific country
 */
router.get('/fuel/prices/:country', async (req, res) => {
    try {
        const { country } = req.params;
        const { fuelType } = req.query;

        if (!country) {
            return res.status(400).json({ error: 'Country code required' });
        }

        // Check if European country
        const europeanCountries = [
            'LT', 'LV', 'EE', 'PL', 'DE', 'FR', 'ES', 'IT',
            'NL', 'BE', 'CZ', 'SK', 'AT', 'CH', 'GB', 'IE',
            'PT', 'GR', 'RO', 'BG', 'HU', 'HR', 'SI', 'DK',
            'SE', 'NO', 'FI', 'IS'
        ];

        if (europeanCountries.includes(country.toUpperCase())) {
            const response = await axios.get(
                `https://${process.env.RAPID_API_HOST}/europeanCountries`,
                {
                    headers: {
                        'x-rapidapi-host': process.env.RAPID_API_HOST,
                        'x-rapidapi-key': process.env.RAPID_API_KEY
                    },
                    timeout: 10000
                }
            );

            if (response.data.success && response.data.result) {
                const countryData = response.data.result.find(item =>
                    matchCountry(item.country, country)
                );

                if (countryData) {
                    const prices = parseFuelPrices(countryData, country);
                    return res.json({
                        success: true,
                        country: country.toUpperCase(),
                        prices: prices,
                        updatedAt: new Date().toISOString()
                    });
                }
            }
        }

        // Fallback to default prices
        const defaultPrices = getDefaultFuelPrices(country, fuelType);
        res.json({
            success: true,
            country: country.toUpperCase(),
            prices: [defaultPrices],
            isEstimated: true,
            updatedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Fuel price error:', error.message);

        // Return default prices as fallback
        const defaultPrices = getDefaultFuelPrices(req.params.country, req.query.fuelType);
        res.json({
            success: true,
            country: req.params.country.toUpperCase(),
            prices: [defaultPrices],
            isEstimated: true,
            updatedAt: new Date().toISOString()
        });
    }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function simplifyRoute(route, maxPoints) {
    if (route.length <= maxPoints) return [];

    const waypoints = [];
    const step = Math.floor(route.length / maxPoints);

    for (let i = step; i < route.length - 1; i += step) {
        waypoints.push({
            lat: route[i].lat,
            lng: route[i].lng
        });
    }

    return waypoints;
}

function estimateTollCost(route) {
    // Simple estimation based on distance and countries
    const distance = calculateDistance(route);
    const countries = detectCountries(route);

    let totalTolls = 0;
    const tollDetails = [];

    countries.forEach(country => {
        const tollRate = getTollRate(country);
        if (tollRate > 0) {
            const estimatedTollKm = distance * 0.6;
            const countryCost = (estimatedTollKm / 100) * tollRate;

            totalTolls += countryCost;
            tollDetails.push({
                name: `${country} highways (estimated)`,
                cost: countryCost,
                currency: 'EUR'
            });
        }
    });

    return {
        totalCost: totalTolls,
        currency: 'EUR',
        tollCount: tollDetails.length,
        tolls: tollDetails
    };
}

function calculateDistance(route) {
    let distance = 0;
    for (let i = 0; i < route.length - 1; i++) {
        distance += haversineDistance(
            route[i].lat, route[i].lng,
            route[i + 1].lat, route[i + 1].lng
        );
    }
    return distance;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a = 0.5 - Math.cos(dLat) / 2 +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        (1 - Math.cos(dLon)) / 2;

    return R * 2 * Math.asin(Math.sqrt(a));
}

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function detectCountries(route) {
    const countries = new Set();
    const samplePoints = [
        route[0],
        route[Math.floor(route.length / 2)],
        route[route.length - 1]
    ];

    samplePoints.forEach(point => {
        const country = guessCountryFromCoordinates(point);
        if (country) countries.add(country);
    });

    return Array.from(countries);
}

function guessCountryFromCoordinates(point) {
    const lat = point.lat;
    const lng = point.lng;

    if (lat >= 54 && lat <= 56 && lng >= 21 && lng <= 27) return 'LT';
    if (lat >= 49 && lat <= 55 && lng >= 14 && lng <= 24) return 'PL';
    if (lat >= 47 && lat <= 55 && lng >= 6 && lng <= 15) return 'DE';

    return null;
}

function getTollRate(country) {
    const rates = {
        'PL': 12.0, 'DE': 0.0, 'FR': 15.0, 'ES': 10.0,
        'IT': 13.0, 'AT': 9.0, 'CH': 8.0, 'CZ': 0.0,
        'SK': 0.0, 'LT': 0.0, 'LV': 0.0, 'EE': 0.0
    };
    return rates[country.toUpperCase()] || 5.0;
}

function matchCountry(apiCountryName, countryCode) {
    const countryNames = {
        'LT': 'Lithuania', 'LV': 'Latvia', 'EE': 'Estonia',
        'PL': 'Poland', 'DE': 'Germany', 'FR': 'France',
        'ES': 'Spain', 'IT': 'Italy', 'NL': 'Netherlands',
        'BE': 'Belgium', 'CZ': 'Czech Republic', 'SK': 'Slovakia',
        'AT': 'Austria', 'CH': 'Switzerland'
    };

    return apiCountryName.toLowerCase() ===
        countryNames[countryCode.toUpperCase()]?.toLowerCase();
}

function parseFuelPrices(data, country) {
    const prices = [];
    const currency = data.currency || 'EUR';

    if (data.gasoline && data.gasoline !== '-') {
        const price = parsePrice(data.gasoline);
        if (price > 0) {
            prices.push({
                country: country.toUpperCase(),
                fuelType: 'petrol_95',
                pricePerLiter: price,
                currency: currency.toUpperCase()
            });
        }
    }

    if (data.diesel && data.diesel !== '-') {
        const price = parsePrice(data.diesel);
        if (price > 0) {
            prices.push({
                country: country.toUpperCase(),
                fuelType: 'diesel',
                pricePerLiter: price,
                currency: currency.toUpperCase()
            });
        }
    }

    if (data.lpg && data.lpg !== '-') {
        const price = parsePrice(data.lpg);
        if (price > 0) {
            prices.push({
                country: country.toUpperCase(),
                fuelType: 'lpg',
                pricePerLiter: price,
                currency: currency.toUpperCase()
            });
        }
    }

    return prices;
}

function parsePrice(priceStr) {
    try {
        const cleaned = priceStr.replace(',', '.').trim();
        return parseFloat(cleaned);
    } catch (e) {
        console.error('Error parsing price:', priceStr);
        return 0.0;
    }
}

function getDefaultFuelPrices(country, fuelType) {
    const defaultPrices = {
        'LT': { petrol_95: 1.45, diesel: 1.42, lpg: 0.65 },
        'LV': { petrol_95: 1.48, diesel: 1.45, lpg: 0.68 },
        'EE': { petrol_95: 1.52, diesel: 1.48, lpg: 0.70 },
        'PL': { petrol_95: 1.38, diesel: 1.35, lpg: 0.60 },
        'DE': { petrol_95: 1.65, diesel: 1.55, lpg: 0.75 },
        'FR': { petrol_95: 1.75, diesel: 1.62, lpg: 0.85 },
        'ES': { petrol_95: 1.50, diesel: 1.42, lpg: 0.70 },
        'IT': { petrol_95: 1.72, diesel: 1.65, lpg: 0.80 }
    };

    const countryPrices = defaultPrices[country.toUpperCase()] ||
        { petrol_95: 1.50, diesel: 1.45, lpg: 0.70 };

    const fuelTypeToUse = fuelType || 'petrol_95';
    const price = countryPrices[fuelTypeToUse] || 1.50;

    return {
        country: country.toUpperCase(),
        fuelType: fuelTypeToUse,
        pricePerLiter: price,
        currency: 'EUR'
    };
}

module.exports = router;
