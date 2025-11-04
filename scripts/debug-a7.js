// scripts/debug-a7-api.js
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function debugA7() {
    console.log('🔍 Debug A7: Milano → Genova\n');

    const route = [
        { lat: 45.4642, lng: 9.1900 },  // Milano
        { lat: 44.4056, lng: 8.9463 }   // Genova
    ];

    try {
        // 1. Спробувати через /calculate
        console.log('1️⃣ Testing /api/tolls/calculate');
        const calcResponse = await axios.post(`${API_URL}/api/tolls/calculate`, {
            route,
            vehicleType: '2AxlesAuto'
        });

        console.log('   Result:', {
            totalCost: calcResponse.data.data.totalCost,
            tollCount: calcResponse.data.data.tollCount,
            isEstimated: calcResponse.data.data.isEstimated,
            countries: calcResponse.data.data.countries,
            roads: [...new Set(calcResponse.data.data.tolls.map(t => t.roadNumber))]
        });

        console.log('   Tolls:');
        calcResponse.data.data.tolls.forEach(toll => {
            console.log(`     - ${toll.name}: €${toll.cost} (${toll.source})`);
        });

        // 2. Перевірити через /country/IT
        console.log('\n2️⃣ Testing /api/tolls/country/IT (A7 only)');
        const countryResponse = await axios.get(`${API_URL}/api/tolls/country/IT`);
        const a7Roads = countryResponse.data.data.tolls.filter(t => t.roadNumber === 'A7');

        console.log(`   Found ${a7Roads.length} A7 segments in DB:`);
        a7Roads.forEach(road => {
            console.log(`     - ${road.name}: €${road.pricing[0].price}`);
        });

        if (a7Roads.length === 0) {
            console.log('   ❌ NO A7 ROADS IN DATABASE!');
            console.log('   Run: npm run seed:italy');
        }

        // 3. Тестувати debug endpoint якщо є
        console.log('\n3️⃣ Testing /api/tolls/debug (if available)');
        try {
            const debugResponse = await axios.post(`${API_URL}/api/tolls/debug`, {
                route,
                vehicleType: '2AxlesAuto'
            });

            console.log('   Geospatial found:', debugResponse.data.data.results.geoIntersects.count);
            console.log('   Roads found:', debugResponse.data.data.results.geoIntersects.roads);
            console.log('   All segments available:', debugResponse.data.data.results.allSegmentsOfFoundRoads.count);
        } catch (err) {
            console.log('   ⚠️ Debug endpoint not available');
        }

        // 4. Аналіз проблеми
        console.log('\n📊 ANALYSIS:');

        if (calcResponse.data.data.isEstimated) {
            console.log('   ❌ Using estimates - roads not found in DB');

            if (a7Roads.length > 0) {
                console.log('   ⚠️ BUT A7 exists in DB!');
                console.log('   Possible issues:');
                console.log('      1. Geospatial query not matching (coordinates issue)');
                console.log('      2. Country detection wrong (detecting FR instead of IT)');
                console.log('      3. Bounding box filter too strict');
            }
        } else {
            const foundA7 = calcResponse.data.data.tolls.some(t => t.roadNumber === 'A7');
            if (foundA7) {
                console.log('   ✅ A7 found and returned correctly!');
            } else {
                console.log('   ⚠️ Found some roads but not A7');
            }
        }

        // 5. Перевірити країни
        console.log('\n🗺️ COUNTRIES DETECTED:');
        console.log('   ', calcResponse.data.data.countries.join(', '));

        if (calcResponse.data.data.countries.includes('FR')) {
            console.log('   ⚠️ France detected! This might cause issues.');
            console.log('   Milano and Genova are in Italy, not France.');
            console.log('   Check geospatial.detectCountries() function.');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response?.data) {
            console.error('   Response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

debugA7();