const express = require('express');
const router = express.Router();
const axios = require('axios');
const NodeCache = require('node-cache');

// Import models
const Vehicle = require('../src/models/Vehicle');

// Cache configuration (6 hours for fuel, 1 hour for routes)
const cache = new NodeCache({ stdTTL: 3600 });

// API Keys from environment
const RAPID_API_KEY = process.env.RAPID_API_KEY;
const TOLLGURU_API_KEY = process.env.TOLLGURU_API_KEY;
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

/**
 * POST /api/route-cost/calculate
 * Body: { startLat, startLng, endLat, endLng, vehicleId }
 * Returns: Complete route cost breakdown
 */
router.post('/calculate', async (req, res) => {
    try {
        const { startLat, startLng, endLat, endLng, vehicleId } = req.body;

        // Validate input
        if (!startLat || !startLng || !endLat || !endLng || !vehicleId) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['startLat', 'startLng', 'endLat', 'endLng', 'vehicleId']
            });
        }

        console.log('📍 Calculating route cost:', { startLat, startLng, endLat, endLng, vehicleId });

        // 1. Get vehicle from database
        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        // 2. Get route from Mapbox (with caching)
        const routeKey = `route_${startLat}_${startLng}_${endLat}_${endLng}`;
        let routeData = cache.get(routeKey);

        if (!routeData) {
            console.log('🗺️ Fetching route from Mapbox...');
            routeData = await getMapboxRoute(startLat, startLng, endLat, endLng);
            cache.set(routeKey, routeData, 3600); // Cache 1 hour
        } else {
            console.log('✅ Using cached route');
        }

        // 3. Detect countries on route (with caching)
        const countriesKey = `countries_${routeKey}`;
        let countries = cache.get(countriesKey);

        if (!countries) {
            console.log('🌍 Detecting countries...');
            countries = await detectCountries(routeData.coordinates);
            cache.set(countriesKey, countries, 21600); // Cache 6 hours
        } else {
            console.log('✅ Using cached countries:', countries);
        }

        // 4. Get fuel prices (with caching)
        const fuelKey = `fuel_${countries.join('_')}_${vehicle.fuelType}`;
        let fuelPrices = cache.get(fuelKey);

        if (!fuelPrices) {
            console.log('⛽ Fetching fuel prices...');
            fuelPrices = await getFuelPrices(countries, vehicle.fuelType);
            cache.set(fuelKey, fuelPrices, 21600); // Cache 6 hours
        } else {
            console.log('✅ Using cached fuel prices');
        }

        // 5. Get toll costs (with caching)
        const tollKey = `toll_${routeKey}_${vehicle.vehicleClass}`;
        let tollData = cache.get(tollKey);

        if (!tollData) {
            console.log('🛣️ Calculating toll costs...');
            tollData = await getTollCosts(routeData.coordinates, vehicle.vehicleClass);
            cache.set(tollKey, tollData, 86400); // Cache 24 hours
        } else {
            console.log('✅ Using cached toll data');
        }

        // 6. Calculate costs
        const fuelNeeded = (routeData.distance / 1000 * vehicle.fuelConsumption.highway) / 100;
        const avgFuelPrice = Object.values(fuelPrices).reduce((a, b) => a + b, 0) / Object.keys(fuelPrices).length;
        const fuelCost = fuelNeeded * avgFuelPrice;
        const totalCost = fuelCost + tollData.totalCost;

        // 7. Return complete result
        const result = {
            distance: routeData.distance / 1000, // km
            duration: routeData.duration, // seconds
            route: routeData.coordinates,
            countries: countries,
            vehicle: {
                id: vehicle._id,
                name: `${vehicle.manufacturer} ${vehicle.model}`,
                year: vehicle.year,
                fuelType: vehicle.fuelType,
                consumption: vehicle.fuelConsumption
            },
            costs: {
                fuelNeeded: parseFloat(fuelNeeded.toFixed(2)),
                fuelPrices: fuelPrices,
                fuelCost: parseFloat(fuelCost.toFixed(2)),
                tollCost: parseFloat(tollData.totalCost.toFixed(2)),
                totalCost: parseFloat(totalCost.toFixed(2)),
                currency: 'EUR'
            },
            tolls: tollData.tolls,
            cached: {
                route: !!cache.get(routeKey),
                countries: !!cache.get(countriesKey),
                fuel: !!cache.get(fuelKey),
                tolls: !!cache.get(tollKey)
            }
        };

        console.log('✅ Route cost calculated:', {
            distance: result.distance,
            totalCost: result.costs.totalCost
        });

        res.json(result);
    } catch (error) {
        console.error('❌ Error calculating route cost:', error);
        res.status(500).json({
            error: 'Failed to calculate route cost',
            message: error.message
        });
    }
});

// Helper: Get route from Mapbox
async function getMapboxRoute(startLat, startLng, endLat, endLng) {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}`;

    const response = await axios.get(url, {
        params: {
            geometries: 'geojson',
            overview: 'full',
            steps: true,
            access_token: MAPBOX_ACCESS_TOKEN
        },
        timeout: 10000
    });

    if (!response.data.routes || response.data.routes.length === 0) {
        throw new Error('No route found');
    }

    const route = response.data.routes[0];

    return {
        distance: route.distance, // meters
        duration: route.duration, // seconds
        coordinates: route.geometry.coordinates.map(coord => ({
            lng: coord[0],
            lat: coord[1]
        }))
    };
}

// Helper: Detect countries on route
async function detectCountries(coordinates) {
    const countries = new Set();

    // Sample 10 points along the route
    const sampleSize = Math.min(10, coordinates.length);
    const step = Math.floor(coordinates.length / sampleSize);

    for (let i = 0; i < coordinates.length; i += step) {
        try {
            const coord = coordinates[i];
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${coord.lng},${coord.lat}.json`;

            const response = await axios.get(url, {
                params: {
                    types: 'country',
                    access_token: MAPBOX_ACCESS_TOKEN
                },
                timeout: 5000
            });

            if (response.data.features && response.data.features.length > 0) {
                const feature = response.data.features[0];
                let countryCode = feature.properties?.short_code;

                if (countryCode) {
                    countryCode = countryCode.split('-')[0].toUpperCase();
                    countries.add(countryCode);
                }
            }
        } catch (error) {
            console.error('Error detecting country:', error.message);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return Array.from(countries);
}

// Helper: Get fuel prices from RapidAPI
async function getFuelPrices(countries, fuelType) {
    const prices = {};

    try {
        const response = await axios.get('https://gas-price.p.rapidapi.com/europeanCountries', {
            headers: {
                'x-rapidapi-host': 'gas-price.p.rapidapi.com',
                'x-rapidapi-key': RAPID_API_KEY
            },
            timeout: 10000
        });

        if (response.data.success && response.data.result) {
            const countryNameMap = {
                'LT': 'Lithuania',
                'LV': 'Latvia',
                'EE': 'Estonia',
                'PL': 'Poland',
                'DE': 'Germany',
                'FR': 'France'
            };

            for (const country of countries) {
                const countryName = countryNameMap[country];
                if (!countryName) continue;

                const countryData = response.data.result.find(
                    item => item.country.toLowerCase() === countryName.toLowerCase()
                );

                if (countryData) {
                    let price;
                    if (fuelType === 'diesel' && countryData.diesel !== '-') {
                        price = parseFloat(countryData.diesel.replace(',', '.'));
                    } else if (fuelType.startsWith('petrol') && countryData.gasoline !== '-') {
                        price = parseFloat(countryData.gasoline.replace(',', '.'));
                    } else if (fuelType === 'lpg' && countryData.lpg !== '-') {
                        price = parseFloat(countryData.lpg.replace(',', '.'));
                    }

                    if (price && price > 0) {
                        prices[country] = price;
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error fetching fuel prices:', error.message);
    }

    // Use defaults if API failed
    if (Object.keys(prices).length === 0) {
        const defaults = {
            'LT': 1.42, 'PL': 1.35, 'DE': 1.55,
            'FR': 1.62, 'ES': 1.42, 'IT': 1.65
        };
        for (const country of countries) {
            prices[country] = defaults[country] || 1.50;
        }
    }

    return prices;
}

// Helper: Get toll costs from TollGuru
async function getTollCosts(coordinates, vehicleClass) {
    try {
        if (!TOLLGURU_API_KEY || TOLLGURU_API_KEY === 'your_key_here') {
            throw new Error('TollGuru API not configured');
        }

        // Simplify coordinates (max 20 waypoints)
        const simplified = simplifyRoute(coordinates, 20);

        const requestBody = {
            source: {
                lat: coordinates[0].lat,
                lng: coordinates[0].lng
            },
            destination: {
                lat: coordinates[coordinates.length - 1].lat,
                lng: coordinates[coordinates.length - 1].lng
            },
            waypoints: simplified,
            vehicleType: mapVehicleType(vehicleClass),
            units: 'metric'
        };

        const response = await axios.post(
            'https://apis.tollguru.com/toll/v2/origin-destination-waypoints',
            requestBody,
            {
                headers: {
                    'x-api-key': TOLLGURU_API_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            }
        );

        if (response.data.route) {
            const costs = response.data.route.costs;
            const tolls = response.data.route.tolls || [];

            return {
                totalCost: costs.tag || costs.cash || 0,
                tolls: tolls.map(toll => ({
                    name: toll.name || 'Unknown',
                    cost: toll.tagCost || 0,
                    currency: toll.currency || 'EUR'
                })),
                isEstimated: false
            };
        }
    } catch (error) {
        console.error('TollGuru API failed, using estimation:', error.message);
    }

    // Fallback estimation
    return estimateTollCosts(coordinates);
}

// Helper: Estimate toll costs (fallback)
function estimateTollCosts(coordinates) {
    const distance = calculateDistance(coordinates);

    const tollRates = {
        'PL': 12.0, 'FR': 15.0, 'ES': 10.0,
        'IT': 13.0, 'AT': 9.0
    };

    // Rough estimate: 60% of route on toll roads
    const estimatedTollKm = distance * 0.6;
    const totalCost = (estimatedTollKm / 100) * 12; // Average €12/100km

    return {
        totalCost: totalCost,
        tolls: [{
            name: 'Estimated highway tolls',
            cost: totalCost,
            currency: 'EUR'
        }],
        isEstimated: true
    };
}

// Helper: Calculate distance
function calculateDistance(coordinates) {
    let distance = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
        distance += haversine(
            coordinates[i].lat, coordinates[i].lng,
            coordinates[i + 1].lat, coordinates[i + 1].lng
        );
    }
    return distance;
}

// Helper: Haversine formula
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Helper: Simplify route
function simplifyRoute(coordinates, maxPoints) {
    if (coordinates.length <= maxPoints) return [];

    const waypoints = [];
    const step = Math.floor(coordinates.length / maxPoints);

    for (let i = step; i < coordinates.length - 1; i += step) {
        waypoints.push({
            lat: coordinates[i].lat,
            lng: coordinates[i].lng
        });
    }

    return waypoints;
}

// Helper: Map vehicle types
function mapVehicleType(vehicleClass) {
    const mapping = {
        'car': '2AxlesAuto',
        'van': '3AxlesAuto',
        'truck': '4AxlesTruck',
        'motorcycle': '2AxlesBike'
    };
    return mapping[vehicleClass] || '2AxlesAuto';
}

module.exports = router;