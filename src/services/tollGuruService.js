// services/tollGuruService.js
const axios = require('axios');

const TOLLGURU_API_KEY = process.env.TOLLGURU_API_KEY;
const TOLL_TALLY_URL = 'https://apis.tollguru.com/toll/v2/complete-polyline-from-mapping-service';

class TollGuruService {
    /**
     * Get toll costs from Toll Tally API using polyline from Google Routes
     */
    async getTollCosts(polyline, vehicleType = '2AxlesAuto') {
        console.log('📍 Polyline sample:', polyline.slice(0, 50), '...');

        if (!TOLLGURU_API_KEY) {
            console.warn('⚠️  Toll Tally API key not configured');
            return null;
        }

        try {
            console.log('💳 Requesting toll data from Toll Tally API...');

            const requestBody = {
                source: 'google',
                polyline: polyline,
                vehicle: {
                    type: vehicleType
                },
                departure_time: new Date().toISOString()
            };

            const response = await axios.post(
                TOLL_TALLY_URL,
                requestBody,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': TOLLGURU_API_KEY
                    },
                    timeout: 30000
                }
            );

            console.log('✅ Toll Tally response received');
            return this.parseTollTallyResponse(response.data);

        } catch (error) {
            console.error('❌ Error fetching tolls from Toll Tally:');
            console.error('Status:', error.response?.status);
            console.error('Data:', error.response?.data);
            console.error('Message:', error.message);

            // Don't throw - return null to fallback
            return null;
        }
    }

    /**
     * Parse Toll Tally API response
     */
    parseTollTallyResponse(data) {
        console.log('🔍 Parsing Toll Tally response...');

        if (!data || !data.route) {
            console.log('⚠️  No route data in response');
            return null;
        }

        const route = data.route;

        // Check if tolls exist
        if (!route.tolls || route.tolls.length === 0) {
            console.log('ℹ️  No tolls on this route');
            return {
                total: 0,
                totalOriginal: 0,
                currency: 'EUR',
                breakdown: [],
                source: 'toll-tally'
            };
        }

        const tolls = route.tolls;
        const costs = route.costs || {};

        console.log(`📊 Found ${tolls.length} toll(s)`);

        // Get total cost (prefer tag/electronic, fallback to cash)
        const totalCost = costs.tag || costs.cash || 0;
        const currency = costs.currency || 'USD';

        // Build breakdown
        const breakdown = tolls.map((toll, index) => {
            const tollCost = toll.tagCost || toll.cashCost || 0;
            const tollCurrency = toll.currency || currency;

            return {
                name: toll.name || `Toll ${index + 1}`,
                cost: this.convertToEUR(tollCost, tollCurrency),
                costOriginal: tollCost,
                currency: tollCurrency,
                country: toll.country || 'Unknown',
                road: toll.road || '',
                lat: toll.lat,
                lng: toll.lng,
                arrival: toll.arrival,
                description: `${toll.name || 'Toll'} - ${toll.road || ''}`
            };
        });

        const totalEUR = this.convertToEUR(totalCost, currency);

        console.log(`💰 Total toll cost: ${totalCost} ${currency} (≈ €${totalEUR})`);

        return {
            total: totalEUR,
            totalOriginal: totalCost,
            currency: currency,
            breakdown: breakdown,
            source: 'toll-tally',
            summary: {
                distance: route.summary?.distance,
                duration: route.summary?.duration,
            }
        };
    }

    /**
     * Convert currency to EUR
     * Uses approximate exchange rates (update periodically)
     */
    convertToEUR(amount, fromCurrency) {
        if (!amount || amount === 0) return 0;

        const exchangeRates = {
            'EUR': 1.0,
            'USD': 0.92,      // $1 ≈ €0.92
            'GBP': 1.16,      // £1 ≈ €1.16
            'CHF': 1.03,      // CHF 1 ≈ €1.03
            'PLN': 0.23,      // 1 PLN ≈ €0.23
            'CZK': 0.04,      // 1 CZK ≈ €0.04
            'SEK': 0.086,     // 1 SEK ≈ €0.086
            'NOK': 0.087,     // 1 NOK ≈ €0.087
            'DKK': 0.13,      // 1 DKK ≈ €0.13
            'HUF': 0.0026,    // 1 HUF ≈ €0.0026
            'RON': 0.20,      // 1 RON ≈ €0.20
            'HRK': 0.13,      // 1 HRK ≈ €0.13
            'RSD': 0.0085,    // 1 RSD ≈ €0.0085
        };

        const rate = exchangeRates[fromCurrency] || 1.0;
        return parseFloat((amount * rate).toFixed(2));
    }

    /**
     * Check if Toll Tally is configured
     */
    isConfigured() {
        return !!TOLLGURU_API_KEY;
    }
}

module.exports = new TollGuruService();