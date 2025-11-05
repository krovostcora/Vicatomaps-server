// services/tollService.js

class TollService {
    /**
     * Estimate toll costs for a route
     */
    async estimateTolls(route) {
        try {
            const tollInfo = route.travelAdvisory?.tollInfo || route.tollInfo;

            console.log(`Toll info from Google:`, JSON.stringify(tollInfo, null, 2));

            // First, try to use Google's toll calculations if available
            if (tollInfo && tollInfo.estimatedPrice && tollInfo.estimatedPrice.length > 0) {
                console.log('Using Google toll data');
                return this.parseGoogleTollInfo(tollInfo);
            }

            // Fallback to our estimation since Google doesn't provide toll info
            console.log('Google toll info not available, using estimated tolls');

            const countries = route.countries || [];

            console.log(`Calculating tolls for countries: ${countries.join(', ')}, distance: ${route.distance}km`);

            if (countries.length === 0) {
                console.log('No countries detected, returning zero tolls');
                return {
                    total: 0,
                    breakdown: []
                };
            }

            // Calculate toll costs based on distance and countries
            const breakdown = this.calculateTollBreakdown(route, []);
            const total = breakdown.reduce((sum, toll) => sum + toll.cost, 0);

            console.log(`Total toll cost (estimated): €${total.toFixed(2)}`);
            console.log('Toll breakdown:', breakdown);

            return {
                total: parseFloat(total.toFixed(2)),
                breakdown: breakdown,
                source: 'estimated'
            };

        } catch (error) {
            console.error('Error estimating tolls:', error.message);
            console.error('Stack:', error.stack);
            return {
                total: 0,
                breakdown: []
            };
        }
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
            console.log('No countries, returning empty breakdown');
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
            'FR': {
                type: 'distance-based',
                ratePerKm: 0.10, // France has expensive tolls, average €0.10/km
                vignette: 0,
                description: 'French motorway tolls'
            },
            'IT': {
                type: 'distance-based',
                ratePerKm: 0.08,
                vignette: 0,
                description: 'Italian highway tolls'
            },
            'ES': {
                type: 'distance-based',
                ratePerKm: 0.09,
                vignette: 0,
                description: 'Spanish toll roads'
            },
            'PT': {
                type: 'distance-based',
                ratePerKm: 0.10,
                vignette: 0,
                description: 'Portuguese toll roads'
            },
            'AT': {
                type: 'vignette',
                ratePerKm: 0,
                vignette: 9.60, // 10-day vignette
                description: 'Austrian vignette (10 days)'
            },
            'CH': {
                type: 'vignette',
                ratePerKm: 0,
                vignette: 40.00, // Annual vignette
                description: 'Swiss vignette (annual)'
            },
            'CZ': {
                type: 'vignette',
                ratePerKm: 0,
                vignette: 8.50, // 210 CZK ≈ €8.50, 1-day vignette
                description: 'Czech vignette (1 day)'
            },
            'SK': {
                type: 'vignette',
                ratePerKm: 0,
                vignette: 10.00, // 10-day vignette
                description: 'Slovak vignette (10 days)'
            },
            'SI': {
                type: 'vignette',
                ratePerKm: 0,
                vignette: 15.00, // Weekly vignette
                description: 'Slovenian vignette (weekly)'
            },
            'PL': {
                type: 'distance-based',
                ratePerKm: 0.05,
                vignette: 0,
                description: 'Polish highway tolls'
            },
            'HR': {
                type: 'distance-based',
                ratePerKm: 0.06,
                vignette: 0,
                description: 'Croatian highway tolls'
            },
            'GR': {
                type: 'distance-based',
                ratePerKm: 0.07,
                vignette: 0,
                description: 'Greek highway tolls'
            },
            'DE': {
                type: 'free',
                ratePerKm: 0,
                vignette: 0,
                description: 'Free for passenger vehicles'
            },
            'NL': {
                type: 'free',
                ratePerKm: 0,
                vignette: 0,
                description: 'Free motorways'
            },
            'BE': {
                type: 'free',
                ratePerKm: 0,
                vignette: 0,
                description: 'Free motorways'
            }
        };

        const config = tollConfigs[countryCode] || {
            type: 'unknown',
            ratePerKm: 0.05,
            vignette: 0,
            description: 'Estimated toll'
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