// tests/unit/services/tollService.test.js
const tollService = require('../../../src/services/tollService');

describe('TollService', () => {
    describe('calculateTolls', () => {
        it('should calculate tolls from MongoDB', async () => {
            const route = [
                { lat: 54.898, lng: 23.905 },
                { lat: 52.517, lng: 13.389 }
            ];

            const result = await tollService.calculateTolls(route, '2AxlesAuto');

            expect(result).toHaveProperty('totalCost');
            expect(result).toHaveProperty('tolls');
            expect(result.tolls).toBeInstanceOf(Array);
            expect(result.totalCost).toBeGreaterThan(0);
        });

        it('should return estimates when no roads found', async () => {
            const route = [
                { lat: 54.687, lng: 25.280 }, // Vilnius
                { lat: 54.898, lng: 23.903 }  // Kaunas
            ];

            const result = await tollService.calculateTolls(route, '2AxlesAuto');

            expect(result.isEstimated).toBe(true);
            expect(result.totalCost).toBe(0); // Lithuania free
        });
    });
});