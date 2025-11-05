// services/costService.js
const vehicleService = require('./vehicleService');
const fuelPriceService = require('./fuelPriceService');
const tollService = require('./tollService');

class CostService {
    /**
     * Calculate total cost for a route
     */
    async calculateRouteCost(route, vehicleId) {
        try {
            console.log(`Calculating route cost for vehicle: ${vehicleId}`);

            // Get vehicle details
            const vehicle = await vehicleService.getVehicleById(vehicleId);
            if (!vehicle) {
                throw new Error('Vehicle not found');
            }

            console.log(`Vehicle found:`, {
                id: vehicle._id,
                name: vehicle.name,
                fuelType: vehicle.fuelType,
                consumption: vehicle.consumption
            });

            // Ensure route has countries
            if (!route.countries || route.countries.length === 0) {
                console.warn('No countries detected in route, using default');
                route.countries = ['DE']; // Default country if none detected
            }

            console.log(`Route: ${route.distance}km through ${route.countries.join(', ')}`);

            // Calculate fuel cost
            const fuelCost = await this.calculateFuelCost(route, vehicle);

            // Calculate toll cost
            const tollCost = await this.calculateTollCost(route);

            // Calculate total cost
            const totalCost = (fuelCost.total || 0) + (tollCost.total || 0);

            console.log(`Final costs: Fuel=€${fuelCost.total}, Tolls=€${tollCost.total}, Total=€${totalCost}`);

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
            console.error('Stack:', error.stack);
            throw error;
        }
    }

    /**
     * Calculate fuel cost for the route
     */
    async calculateFuelCost(route, vehicle) {
        try {
            const distance = route.distance; // in km
            const consumption = vehicle.consumption; // liters per 100km
            const fuelType = vehicle.fuelType;

            console.log(`Calculating fuel cost: distance=${distance}km, consumption=${consumption}L/100km, fuelType=${fuelType}`);

            // Calculate total fuel needed
            const totalLiters = (distance / 100) * consumption;

            // Get countries on the route
            const countries = route.countries || ['DE']; // Default to Germany if no countries

            console.log(`Countries on route: ${countries.join(', ')}`);

            // Get fuel prices for all countries
            const fuelPrices = await fuelPriceService.getFuelPrices(countries, fuelType);

            console.log(`Fuel prices fetched:`, fuelPrices);

            // Calculate average fuel price across countries
            const averageFuelPrice = this.calculateAverageFuelPrice(fuelPrices);

            // Calculate cost breakdown per country
            const litersPerCountry = totalLiters / countries.length; // Simplified: equal distribution
            const breakdown = fuelPrices.map(fp => {
                const cost = litersPerCountry * fp.price;
                return {
                    country: fp.country,
                    pricePerLiter: fp.price,
                    estimatedLiters: parseFloat(litersPerCountry.toFixed(2)),
                    cost: parseFloat(cost.toFixed(2))
                };
            });

            const totalCost = totalLiters * averageFuelPrice;

            console.log(`Total fuel cost: €${totalCost.toFixed(2)} (${totalLiters.toFixed(2)}L @ €${averageFuelPrice.toFixed(2)}/L avg)`);

            return {
                total: parseFloat(totalCost.toFixed(2)),
                totalLiters: parseFloat(totalLiters.toFixed(2)),
                breakdown: breakdown
            };
        } catch (error) {
            console.error('Error in calculateFuelCost:', error);
            throw error;
        }
    }

    /**
     * Calculate toll cost for the route
     */
    async calculateTollCost(route) {
        try {
            const tollInfo = route.tollInfo || {};

            if (!tollInfo || Object.keys(tollInfo).length === 0) {
                console.log('⚠️ No Google toll info, trying TollGuru fallback...');
            }


            // Get toll estimates
            const tollEstimates = await tollService.estimateTolls(route);

            return {
                total: tollEstimates.total,
                breakdown: tollEstimates.breakdown
            };

        } catch (error) {
            console.error('Error calculating toll cost:', error.message);
            // Return zero cost if toll calculation fails
            return {
                total: 0,
                breakdown: []
            };
        }
    }

    /**
     * Calculate average fuel price from multiple countries
     */
    calculateAverageFuelPrice(fuelPrices) {
        if (fuelPrices.length === 0) return 0;

        const sum = fuelPrices.reduce((acc, fp) => acc + fp.price, 0);
        return sum / fuelPrices.length;
    }

    /**
     * Calculate cost comparison between routes
     */
    async compareRoutes(routes, vehicleId) {
        const routesWithCosts = await Promise.all(
            routes.map(async route => {
                const costs = await this.calculateRouteCost(route, vehicleId);
                return {
                    routeIndex: route.routeIndex,
                    distance: route.distance,
                    duration: route.duration,
                    costs: costs
                };
            })
        );

        // Find cheapest and fastest
        const cheapest = routesWithCosts.reduce((min, route) =>
            route.costs.totalCost < min.costs.totalCost ? route : min
        );

        const fastest = routesWithCosts.reduce((min, route) =>
            route.duration < min.duration ? route : min
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