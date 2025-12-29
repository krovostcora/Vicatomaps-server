// services/tollService.js
const tollGuruService = require('./tollGuruService.js');

class TollService {
    /**
     * Estimate toll costs for a route
     */
    async estimateTolls(route) {
        try {
            console.log('\n=== TOLL CALCULATION START ===');

            // Step 1: Try TollGuru API (most accurate for all regions)
            if (tollGuruService.isConfigured() && route.polyline) {
                console.log('Attempting TollGuru API...');
                const tollGuruData = await tollGuruService.getTollCosts(route.polyline);

                if (tollGuruData && tollGuruData.total > 0) {
                    console.log('Using TollGuru data');
                    return tollGuruData;
                }
            } else {
                if (!route.polyline) {
                    console.warn('No polyline available for TollGuru');
                }
                if (!tollGuruService.isConfigured()) {
                    console.warn('TollGuru API key not configured');
                }
            }

            // Step 2: Try Google's toll info (USA, Canada, India, Indonesia, Japan)
            const routeTollInfo = route.travelAdvisory?.tollInfo || route.tollInfo || {};

            if (routeTollInfo.estimatedPrice && routeTollInfo.estimatedPrice.length > 0) {
                console.log('Using Google toll data');
                return this.parseGoogleTollInfo(routeTollInfo);
            }

            // Step 3: Check leg-level toll info
            let legTollInfo = [];
            if (route.legs && Array.isArray(route.legs)) {
                route.legs.forEach(leg => {
                    if (leg.travelAdvisory?.tollInfo?.estimatedPrice) {
                        legTollInfo.push(leg.travelAdvisory.tollInfo);
                    }
                });
            }

            if (legTollInfo.length > 0) {
                console.log('Using Google leg-level toll data');
                return this.parseGoogleTollInfoFromLegs(legTollInfo);
            }

            // Step 4: Fallback to our estimates based on countries
            console.warn('Using estimated tolls (no API data available)');

            const countries = route.countries || [];

            if (countries.length === 0) {
                console.warn('No countries detected, returning zero tolls');
                return { total: 0, breakdown: [], source: 'none' };
            }

            const breakdown = this.calculateTollBreakdown(route, []);
            const total = breakdown.reduce((sum, toll) => sum + toll.cost, 0);

            console.log(`Estimated total: ${total.toFixed(2)} EUR`);
            console.log('=== TOLL CALCULATION END ===\n');

            return {
                total: parseFloat(total.toFixed(2)),
                breakdown: breakdown,
                source: 'estimated'
            };

        } catch (error) {
            console.error('Error estimating tolls:', error.message);
            return { total: 0, breakdown: [], source: 'error' };
        }
    }

    /**
     * Parse Google's toll information from legs
     */
    parseGoogleTollInfoFromLegs(legTollInfos) {
        console.log('Parsing toll info from legs');

        const allPrices = [];

        legTollInfos.forEach(tollInfo => {
            if (tollInfo.estimatedPrice && Array.isArray(tollInfo.estimatedPrice)) {
                allPrices.push(...tollInfo.estimatedPrice);
            }
        });

        if (allPrices.length === 0) {
            return {
                total: 0,
                breakdown: [],
                source: 'google'
            };
        }

        const breakdown = allPrices.map((price, index) => {
            const amount = this.convertGooglePrice(price);
            return {
                description: `Toll section ${index + 1}`,
                cost: amount,
                currency: price.currencyCode || 'EUR',
                source: 'google'
            };
        });

        const total = breakdown.reduce((sum, item) => sum + item.cost, 0);

        return {
            total: parseFloat(total.toFixed(2)),
            breakdown: breakdown,
            source: 'google'
        };
    }

    /**
     * Parse Google's toll information
     */
    parseGoogleTollInfo(tollInfo) {
        console.log('Using Google toll data');

        // Google returns toll info with estimatedPrice array
        const estimatedPrices = tollInfo.estimatedPrice || [];

        if (estimatedPrices.length === 0) {
            return {
                total: 0,
                breakdown: [],
                source: 'google'
            };
        }

        // Convert Google's price format to our format
        const breakdown = estimatedPrices.map(price => {
            const amount = this.convertGooglePrice(price);
            return {
                description: 'Toll fee',
                cost: amount,
                currency: price.currencyCode || 'EUR',
                source: 'google'
            };
        });

        const total = breakdown.reduce((sum, item) => sum + item.cost, 0);

        return {
            total: parseFloat(total.toFixed(2)),
            breakdown: breakdown,
            source: 'google'
        };
    }

    /**
     * Convert Google's price format to decimal number
     */
    convertGooglePrice(price) {
        if (!price) return 0;

        // Google returns price in format: { units: "33", nanos: 800000000, currencyCode: "EUR" }
        const units = parseInt(price.units || 0);
        const nanos = parseInt(price.nanos || 0);

        // Convert nanos (billionths) to decimal
        const amount = units + (nanos / 1000000000);

        return parseFloat(amount.toFixed(2));
    }

    /**
     * Calculate toll breakdown by country
     */
    calculateTollBreakdown(route, tollPasses) {
        console.log('calculateTollBreakdown called with:', {
            countries: route.countries,
            distance: route.distance
        });

        const countries = route.countries || [];
        const totalDistance = route.distance;
        const breakdown = [];

        if (countries.length === 0) {
            console.warn('No countries, returning empty breakdown');
            return breakdown;
        }

        // Estimate distance per country (simplified: proportional distribution)
        const distancePerCountry = totalDistance / countries.length;

        console.log(`Processing ${countries.length} countries, ${distancePerCountry}km each`);

        countries.forEach(countryCode => {
            console.log(`Getting toll data for ${countryCode}...`);
            const tollData = this.getCountryTollData(countryCode, distancePerCountry);

            console.log(`${countryCode} toll data:`, tollData);

            if (tollData.totalCost > 0) {
                const entry = {
                    country: countryCode,
                    type: tollData.type,
                    distanceToll: parseFloat(tollData.distanceCost.toFixed(2)),
                    vignette: parseFloat(tollData.vignetteCost.toFixed(2)),
                    cost: parseFloat(tollData.totalCost.toFixed(2)),
                    currency: 'EUR',
                    description: tollData.description
                };
                console.log(`Adding toll entry:`, entry);
                breakdown.push(entry);
            } else {
                console.log(`${countryCode} has no tolls (cost: ${tollData.totalCost})`);
            }
        });

        console.log(`Final breakdown has ${breakdown.length} entries`);
        return breakdown;
    }

    /**
     * Get toll data for a specific country
     */
    getCountryTollData(countryCode, distance) {
        // Toll rates and vignette costs based on real European toll systems
        const tollConfigs = {
            // France - expensive tolls
            'FR': {
                type: 'distance-based',
                ratePerKm: 0.10,  // 0.10 EUR/km average on French autoroutes
                vignette: 0,
                description: 'French motorway tolls (péages)'
            },
            // Italy
            'IT': {
                type: 'distance-based',
                ratePerKm: 0.07,
                vignette: 0,
                description: 'Italian autostrada tolls'
            },
            // Spain
            'ES': {
                type: 'distance-based',
                ratePerKm: 0.09,
                vignette: 0,
                description: 'Spanish autopista tolls'
            },
            // Portugal
            'PT': {
                type: 'distance-based',
                ratePerKm: 0.10,
                vignette: 0,
                description: 'Portuguese toll roads'
            },
            // Austria - vignette system
            'AT': {
                type: 'vignette',
                ratePerKm: 0,
                vignette: 9.60,  // 10-day vignette
                description: 'Austrian vignette (10 days) - 9.60 EUR'
            },
            // Switzerland - annual vignette
            'CH': {
                type: 'vignette',
                ratePerKm: 0,
                vignette: 40.00,  // annual vignette (mandatory)
                description: 'Swiss vignette (annual) - CHF 40 (~40 EUR)'
            },
            // Czech Republic - vignette
            'CZ': {
                type: 'vignette',
                ratePerKm: 0,
                vignette: 8.50,  // 210 CZK for 1 day ≈ 8.50 EUR
                description: 'Czech vignette (1 day) - 210 CZK (~8.50 EUR)'
            },
            // Slovakia - vignette
            'SK': {
                type: 'vignette',
                ratePerKm: 0,
                vignette: 10.00, // 10-day vignette
                description: 'Slovak vignette (10 days) - 10 EUR'
            },
            // Slovenia - vignette
            'SI': {
                type: 'vignette',
                ratePerKm: 0,
                vignette: 15.00, // Weekly vignette
                description: 'Slovenian vignette (weekly) - 15 EUR'
            },
            // Poland
            'PL': {
                type: 'distance-based',
                ratePerKm: 0.05,
                vignette: 0,
                description: 'Polish highway tolls'
            },
            // Croatia
            'HR': {
                type: 'distance-based',
                ratePerKm: 0.06,
                vignette: 0,
                description: 'Croatian highway tolls'
            },
            // Greece
            'GR': {
                type: 'distance-based',
                ratePerKm: 0.07,
                vignette: 0,
                description: 'Greek highway tolls'
            },
            // Germany - FREE for cars
            'DE': {
                type: 'free',
                ratePerKm: 0,
                vignette: 0,
                description: 'Free motorways (trucks pay, cars free)'
            },
            // Netherlands - FREE
            'NL': {
                type: 'free',
                ratePerKm: 0,
                vignette: 0,
                description: 'Free motorways'
            },
            // Belgium - FREE
            'BE': {
                type: 'free',
                ratePerKm: 0,
                vignette: 0,
                description: 'Free motorways'
            },
            // USA states with tolls
            'US': {
                type: 'distance-based',
                ratePerKm: 0.05, // Average, varies by state
                vignette: 0,
                description: 'US toll roads (varies by state)'
            }
        };

        const config = tollConfigs[countryCode] || {
            type: 'unknown',
            ratePerKm: 0,
            vignette: 0,
            description: 'No toll data available'
        };

        const distanceCost = distance * config.ratePerKm;
        const vignetteCost = config.vignette;
        const totalCost = distanceCost + vignetteCost;

        return {
            type: config.type,
            distanceCost: distanceCost,
            vignetteCost: vignetteCost,
            totalCost: totalCost,
            description: config.description
        };
    }

    /**
     * Get toll information for specific country
     */
    getTollInfo(countryCode) {
        const tollInfo = {
            'FR': {
                type: 'distance-based',
                description: 'Most highways are tolled',
                averageRate: 0.12
            },
            'IT': {
                type: 'distance-based',
                description: 'Extensive toll highway network',
                averageRate: 0.08
            },
            'ES': {
                type: 'distance-based',
                description: 'Mix of toll and free highways',
                averageRate: 0.09
            },
            'AT': {
                type: 'vignette',
                description: 'Requires vignette for highways',
                cost: 9.60
            },
            'CH': {
                type: 'vignette',
                description: 'Annual vignette required',
                cost: 40.00
            },
            'DE': {
                type: 'free',
                description: 'Free for passenger vehicles',
                cost: 0
            }
        };

        return tollInfo[countryCode] || {
            type: 'unknown',
            description: 'Toll information not available',
            cost: 0
        };
    }
}

module.exports = new TollService();
