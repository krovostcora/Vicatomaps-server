// src/services/costService.js
const vehicleService = require('./vehicleService');
const fuelPriceService = require('./fuelPriceService');
const tollService = require('./tollService');

class CostService {
    /**
     * Calculate total cost for a route, including fuel and tolls.
     */
    async calculateRouteCost(route, vehicleId) {
        try {
            console.log(`Calculating route cost for vehicle: ${vehicleId}`);

            const vehicle = await vehicleService.getVehicleById(vehicleId);
            if (!vehicle) {
                throw new Error('Vehicle not found');
            }

            console.log('Vehicle found:', {
                id: vehicle._id,
                name: vehicle.name,
                fuelType: vehicle.fuelType,
                consumption: vehicle.consumption
            });

            // Ensure route has country list
            if (!route.countries || route.countries.length === 0) {
                console.warn('No countries detected in route, using default [DE]');
                route.countries = ['DE'];
            }

            console.log(`Route: ${route.distance} km through ${route.countries.join(', ')}`);

            // Calculate individual components
            const fuelCost = await this.calculateFuelCost(route, vehicle);
            const tollCost = await this.calculateTollCost(route);

            const totalCost = (fuelCost.total || 0) + (tollCost.total || 0);

            console.log(
                `Final costs: Fuel=€${fuelCost.total}, Tolls=€${tollCost.total}, Total=€${totalCost}`
            );

            return {
                fuelCost: {
                    total: fuelCost.total || 0,
                    breakdown: fuelCost.breakdown || [],
                    totalLiters: fuelCost.totalLiters || 0
                },
                tollCost: {
                    total: tollCost.total || 0,
                    breakdown: tollCost.breakdown || []
                },
                totalCost: parseFloat(totalCost.toFixed(2)),
                currency: 'EUR',
                vehicle: {
                    id: vehicle._id,
                    name: vehicle.name,
                    consumption: vehicle.consumption
                }
            };
        } catch (error) {
            console.error('Error calculating route cost:', error.message);
            console.error(error.stack);
            throw error;
        }
    }

    /**
     * Calculate fuel cost for the route based on distance per country.
     */
    async calculateFuelCost(route, vehicle) {
        try {
            const distance = route.distance; // in km
            const consumption = vehicle.consumption; // L/100km
            const fuelType = vehicle.fuelType.toLowerCase();

            console.log(
                `Calculating fuel cost: distance=${distance} km, consumption=${consumption} L/100km, fuelType=${fuelType}`
            );

            const totalLiters = (distance / 100) * consumption;

            const countries = route.countries || ['DE'];
            console.log(`Countries on route: ${countries.join(', ')}`);

            // Fetch prices for all countries
            const fuelPrices = await fuelPriceService.getFuelPrices(countries, fuelType);
            console.log('Fuel prices fetched:', fuelPrices);

            if (!fuelPrices || fuelPrices.length === 0) {
                console.warn('No fuel price data found, skipping fuel cost calculation.');
                return {
                    total: 0,
                    totalLiters,
                    breakdown: []
                };
            }

            // Evenly distribute distance between all countries (basic version)
            const distancePerCountry = distance / countries.length;
            const breakdown = [];
            let totalCost = 0;
            let totalLitersUsed = 0;

            for (const fp of fuelPrices) {
                const liters = (distancePerCountry / 100) * consumption;
                const price = fp.price || 0;
                const cost = liters * price;

                breakdown.push({
                    country: fp.country,
                    countryCode: fp.countryCode,
                    pricePerLiter: parseFloat(price.toFixed(2)),
                    estimatedLiters: parseFloat(liters.toFixed(2)),
                    cost: parseFloat(cost.toFixed(2))
                });

                totalCost += cost;
                totalLitersUsed += liters;
            }

            console.log(
                `Total fuel cost: €${totalCost.toFixed(2)} (${totalLitersUsed.toFixed(
                    2
                )} L across ${countries.length} countries)`
            );

            return {
                total: parseFloat(totalCost.toFixed(2)),
                totalLiters: parseFloat(totalLitersUsed.toFixed(2)),
                breakdown
            };
        } catch (error) {
            console.error('Error in calculateFuelCost:', error);
            throw error;
        }
    }

    /**
     * Calculate toll cost using tollService or fallback.
     */
    async calculateTollCost(route) {
        try {
            const tollInfo = route.tollInfo || {};

            if (!tollInfo || Object.keys(tollInfo).length === 0) {
                console.log('No Google toll info, using TollGuru fallback...');
            }

            const tollEstimates = await tollService.estimateTolls(route);

            return {
                total: tollEstimates.total,
                breakdown: tollEstimates.breakdown
            };
        } catch (error) {
            console.error('Error calculating toll cost:', error.message);
            return { total: 0, breakdown: [] };
        }
    }

    /**
     * Compare multiple route options by cost and duration.
     */
    async compareRoutes(routes, vehicleId) {
        const routesWithCosts = await Promise.all(
            routes.map(async (route) => {
                const costs = await this.calculateRouteCost(route, vehicleId);
                return {
                    routeIndex: route.routeIndex,
                    distance: route.distance,
                    duration: route.duration,
                    costs
                };
            })
        );

        const cheapest = routesWithCosts.reduce((min, r) =>
            r.costs.totalCost < min.costs.totalCost ? r : min
        );

        const fastest = routesWithCosts.reduce((min, r) =>
            r.duration < min.duration ? r : min
        );

        return {
            routes: routesWithCosts,
            cheapest: cheapest.routeIndex,
            fastest: fastest.routeIndex,
            savings: fastest.costs.totalCost - cheapest.costs.totalCost
        };
    }
}

module.exports = new CostService();
