// services/fuelPriceService.js
const axios = require('axios');
const FuelPrice = require('../models/FuelPrice');

const FUEL_API_KEY = process.env.FUEL_API_KEY;
const FUEL_API_URL = process.env.FUEL_API_URL || 'https://api.example.com/fuel-prices';

class FuelPriceService {
    /**
     * Get fuel prices for multiple countries
     */
    async getFuelPrices(countryCodes, fuelType) {
        const prices = [];

        for (const countryCode of countryCodes) {
            try {
                const price = await this.getFuelPrice(countryCode, fuelType);
                prices.push(price);
            } catch (error) {
                console.error(`Error fetching fuel price for ${countryCode}:`, error.message);
                // Use cached or default price if API fails
                const cachedPrice = await this.getCachedFuelPrice(countryCode, fuelType);
                if (cachedPrice) {
                    prices.push(cachedPrice);
                }
            }
        }

        return prices;
    }

    /**
     * Get fuel price for a specific country
     */
    async getFuelPrice(countryCode, fuelType) {
        try {
            // Check cache first
            const cachedPrice = await this.getCachedFuelPrice(countryCode, fuelType);
            if (cachedPrice && this.isCacheValid(cachedPrice.updatedAt)) {
                return cachedPrice;
            }

            // Fetch from external API
            const response = await axios.get(`${FUEL_API_URL}/${countryCode}`, {
                headers: {
                    'X-API-Key': FUEL_API_KEY
                },
                params: {
                    fuelType: fuelType
                }
            });

            const price = this.parseApiResponse(response.data, countryCode, fuelType);

            // Cache the price
            await this.cacheFuelPrice(price);

            return price;

        } catch (error) {
            console.error(`Error fetching fuel price from API for ${countryCode}:`, error.message);

            // Fallback to cached price even if expired
            const cachedPrice = await this.getCachedFuelPrice(countryCode, fuelType);
            if (cachedPrice) {
                return cachedPrice;
            }

            // Fallback to default prices if no cache available
            return this.getDefaultFuelPrice(countryCode, fuelType);
        }
    }

    /**
     * Parse API response to standard format
     */
    parseApiResponse(data, countryCode, fuelType) {
        return {
            country: countryCode,
            fuelType: fuelType,
            price: data.price || data.value || 0,
            currency: data.currency || 'EUR',
            updatedAt: new Date()
        };
    }

    /**
     * Get cached fuel price from MongoDB
     */
    async getCachedFuelPrice(countryCode, fuelType) {
        try {
            const fuelPrice = await FuelPrice.findOne({
                countryCode: countryCode.toUpperCase(),
                fuelType: fuelType.toLowerCase()
            }).sort({ updatedAt: -1 });

            if (!fuelPrice) {
                return null;
            }

            return {
                country: fuelPrice.countryCode,
                fuelType: fuelPrice.fuelType,
                price: fuelPrice.price,
                currency: fuelPrice.currency,
                updatedAt: fuelPrice.updatedAt
            };
        } catch (error) {
            console.error('Error fetching cached fuel price:', error.message);
            return null;
        }
    }

    /**
     * Cache fuel price in MongoDB
     */
    async cacheFuelPrice(priceData) {
        try {
            await FuelPrice.findOneAndUpdate(
                {
                    countryCode: priceData.country.toUpperCase(),
                    fuelType: priceData.fuelType.toLowerCase()
                },
                {
                    countryCode: priceData.country.toUpperCase(),
                    fuelType: priceData.fuelType.toLowerCase(),
                    price: priceData.price,
                    currency: priceData.currency,
                    updatedAt: priceData.updatedAt
                },
                {
                    upsert: true,
                    new: true
                }
            );
        } catch (error) {
            console.error('Error caching fuel price:', error.message);
        }
    }

    /**
     * Check if cached price is still valid (less than 24 hours old)
     */
    isCacheValid(updatedAt) {
        const cacheAgeHours = (new Date() - new Date(updatedAt)) / (1000 * 60 * 60);
        return cacheAgeHours < 24;
    }

    /**
     * Get default fuel prices (fallback)
     */
    getDefaultFuelPrice(countryCode, fuelType) {
        const defaultPrices = {
            'DE': { petrol: 1.75, diesel: 1.65, electric: 0.35 },
            'FR': { petrol: 1.80, diesel: 1.70, electric: 0.38 },
            'IT': { petrol: 1.85, diesel: 1.72, electric: 0.40 },
            'ES': { petrol: 1.55, diesel: 1.48, electric: 0.32 },
            'PL': { petrol: 1.45, diesel: 1.40, electric: 0.28 },
            'CZ': { petrol: 1.50, diesel: 1.42, electric: 0.30 },
            'AT': { petrol: 1.60, diesel: 1.52, electric: 0.33 },
            'NL': { petrol: 1.95, diesel: 1.75, electric: 0.42 },
            'BE': { petrol: 1.72, diesel: 1.68, electric: 0.36 },
            'CH': { petrol: 1.90, diesel: 1.82, electric: 0.38 }
        };

        const countryPrices = defaultPrices[countryCode] || defaultPrices['DE'];
        const price = countryPrices[fuelType] || countryPrices.petrol;

        return {
            country: countryCode,
            fuelType: fuelType,
            price: price,
            currency: 'EUR',
            updatedAt: new Date()
        };
    }

    /**
     * Initialize default fuel prices
     */
    async initializeDefaultPrices() {
        const countries = ['DE', 'FR', 'IT', 'ES', 'PL', 'CZ', 'AT', 'NL', 'BE', 'CH'];
        const fuelTypes = ['petrol', 'diesel', 'electric'];

        for (const country of countries) {
            for (const fuelType of fuelTypes) {
                const defaultPrice = this.getDefaultFuelPrice(country, fuelType);
                await this.cacheFuelPrice(defaultPrice);
            }
        }
        console.log('Default fuel prices initialized');
    }

    /**
     * Refresh all cached fuel prices
     */
    async refreshAllPrices() {
        const countries = ['DE', 'FR', 'IT', 'ES', 'PL', 'CZ', 'AT', 'NL', 'BE', 'CH'];
        const fuelTypes = ['petrol', 'diesel', 'electric'];

        for (const country of countries) {
            for (const fuelType of fuelTypes) {
                try {
                    await this.getFuelPrice(country, fuelType);
                } catch (error) {
                    console.error(`Failed to refresh price for ${country} - ${fuelType}`);
                }
            }
        }
    }
}

module.exports = new FuelPriceService();