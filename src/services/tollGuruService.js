// services/tollGuruService.js
const axios = require('axios');

const TOLLGURU_API_KEY = process.env.TOLLGURU_API_KEY;
const TOLLGURU_API_URL = 'https://apis.tollguru.com/toll/v2';

class TollGuruService {
    /**
     * Get toll costs from TollGuru using polyline from Google Routes
     */
    async getTollCosts(polyline, vehicleType = 'car', opts = {}) {
        console.log('Polyline sample:', polyline.slice(0, 50), '...');

        if (!TOLLGURU_API_KEY) {
            console.warn('TollGuru API key not configured, skipping toll calculation');
            return null;
        }

        try {
            console.log('Requesting toll data from TollGuru...');

            const requestBody = {
                    source: 'google',
                    polyline,
                    vehicle: {
                        type: '2AxlesAuto'
                    },
                    departure_time: new Date().toISOString()
                };

            console.log('TollGuru request:', { polyline: polyline.substring(0, 50) + '...', vehicleType });

            const response = await axios.post(
                `${TOLLGURU_API_URL}/complete-polyline-from-mapping-service`,
                requestBody,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': TOLLGURU_API_KEY
                    }
                }
            );

            console.log('TollGuru response received');
            return this.parseTollGuruResponse(response.data);


        } catch (error) {
            console.error('Error fetching tolls from TollGuru:');
            console.error('Status:', error.response?.status);
            console.error('Error:', error.response?.data || error.message);

            // Don't throw error, return null to fallback to estimates
            return null;
        }
    }

    /**
     * Parse TollGuru API response
     */
    parseTollGuruResponse(data) {
        if (!data || !data.route) {
            console.log('No route data in TollGuru response');
            return null;
        }

        if (!data.route || !data.route.costs) {
            console.warn('⚠️ TollGuru response has no cost info');
            console.debug('Full response:', JSON.stringify(data, null, 2));
            return null;
        }

        const route = data.route;
        const costs = route.costs;

        if (!costs) {
            console.log('No cost data in TollGuru response');
            return null;
        }

        // TollGuru returns costs in various currencies
        const totalCost = costs.tag || costs.cash || 0;
        const currency = costs.currency || 'USD';

        // Extract individual tolls
        const tolls = route.tolls || [];
        const breakdown = tolls.map(toll => ({
            name: toll.name || 'Toll',
            cost: toll.tag || toll.cash || 0,
            currency: toll.currency || currency,
            country: toll.country || 'Unknown',
            description: toll.name || 'Toll road'
        }));

        console.log(`TollGuru calculated total toll: ${totalCost} ${currency}`);
        console.log(`Number of toll points: ${breakdown.length}`);

        return {
            total: this.convertToEUR(totalCost, currency),
            totalOriginal: totalCost,
            currency: currency,
            breakdown: breakdown,
            source: 'tollguru'
        };
    }

    /**
     * Convert currency to EUR (simplified)
     * In production, use a real currency conversion API
     */
    convertToEUR(amount, fromCurrency) {
        const exchangeRates = {
            'EUR': 1.0,
            'USD': 0.92,
            'GBP': 1.16,
            'CHF': 1.03,
            'PLN': 0.23,
            'CZK': 0.04,
            'SEK': 0.086,
            'NOK': 0.087,
            'DKK': 0.13,
            'HUF': 0.0026,
            'RON': 0.20
        };

        const rate = exchangeRates[fromCurrency] || 1.0;
        return parseFloat((amount * rate).toFixed(2));
    }

    /**
     * Check if TollGuru is configured
     */
    isConfigured() {
        return !!TOLLGURU_API_KEY;
    }
}

module.exports = new TollGuruService();