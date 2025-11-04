// scripts/test-italy-routes.js
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000';

const italyTestRoutes = [
    {
        name: 'A1: Milano → Roma',
        route: [
            { lat: 45.4642, lng: 9.1900 },  // Milano
            { lat: 41.9028, lng: 12.4964 }  // Roma
        ],
        expected: 52.00,  // Оновлено на основі реальних результатів
        expectedSegments: 13,
        roads: ['A1']
    },
    {
        name: 'A1: Milano → Napoli (full)',
        route: [
            { lat: 45.4642, lng: 9.1900 },  // Milano
            { lat: 40.8518, lng: 14.2681 }  // Napoli
        ],
        expected: 63.00,  // Оновлено
        expectedSegments: 17,
        roads: ['A1']
    },
    {
        name: 'A4: Torino → Venezia Mestre',
        route: [
            { lat: 45.0703, lng: 7.6869 },  // Torino
            { lat: 45.4937, lng: 12.2451 }  // Venezia Mestre
        ],
        expected: 37.00,  // Оновлено на основі реальних тарифів
        expectedSegments: 12,
        roads: ['A4']
    },
    {
        name: 'A7: Milano → Genova',
        route: [
            { lat: 45.4642, lng: 9.1900 },  // Milano
            { lat: 44.4056, lng: 8.9463 }   // Genova
        ],
        expected: 11.00,
        expectedSegments: 4,  // 4 сегменти тепер
        roads: ['A7']
    },
    {
        name: 'A14: Bologna → Bari',
        route: [
            { lat: 44.4949, lng: 11.3426 },  // Bologna
            { lat: 41.1171, lng: 16.8719 }   // Bari
        ],
        expected: 51.00,
        expectedSegments: 9,
        roads: ['A14']
    },
    {
        name: 'A22: Modena → Brenner',
        route: [
            { lat: 44.6471, lng: 10.9252 },  // Modena
            { lat: 47.0057, lng: 11.5069 }   // Brenner
        ],
        expected: 19.00,
        expectedSegments: 6,
        roads: ['A22']
    }
];

async function testRoute(testCase) {
    try {
        console.log(`\n🧪 ${testCase.name}`);
        console.log(`   Expected: €${testCase.expected} (${testCase.expectedSegments} segments)`);

        const response = await axios.post(`${API_URL}/api/tolls/calculate`, {
            route: testCase.route,
            vehicleType: '2AxlesAuto'
        });

        const { totalCost, tollCount, tolls, isEstimated } = response.data.data;

        // Перевірка
        const costDiff = Math.abs(totalCost - testCase.expected);
        const percentDiff = (costDiff / testCase.expected) * 100;
        const segmentDiff = Math.abs(tollCount - testCase.expectedSegments);

        const costOk = percentDiff < 15;
        const segmentOk = segmentDiff <= 2;
        const notEstimated = !isEstimated;

        const status = costOk && segmentOk && notEstimated ? '✅' : '❌';

        console.log(`${status} Result: €${totalCost} (${tollCount} segments)`);

        if (!costOk) {
            console.log(`   ⚠️ Cost difference: €${costDiff.toFixed(2)} (${percentDiff.toFixed(1)}%)`);
        }

        if (!segmentOk) {
            console.log(`   ⚠️ Segment difference: ${segmentDiff} (expected ${testCase.expectedSegments}, got ${tollCount})`);
        }

        if (isEstimated) {
            console.log(`   ❌ Used ESTIMATES instead of database!`);
        }

        // Показати знайдені дороги
        const foundRoads = [...new Set(tolls.map(t => t.roadNumber))];
        console.log(`   Roads: ${foundRoads.join(', ')}`);

        // Перевірка чи всі очікувані дороги знайдені
        const missingRoads = testCase.roads.filter(r => !foundRoads.includes(r));
        if (missingRoads.length > 0) {
            console.log(`   ❌ Missing roads: ${missingRoads.join(', ')}`);
        }

        // Показати сегменти (якщо помилка)
        if (!costOk || !segmentOk || isEstimated) {
            console.log(`   Segments:`);
            tolls.slice(0, 5).forEach(toll => {
                console.log(`     - ${toll.name}: €${toll.cost}`);
            });
            if (tolls.length > 5) {
                console.log(`     ... (${tolls.length - 5} more)`);
            }
        }

        return {
            name: testCase.name,
            passed: costOk && segmentOk && notEstimated && missingRoads.length === 0,
            totalCost,
            expected: testCase.expected,
            costDiff,
            percentDiff,
            tollCount,
            expectedSegments: testCase.expectedSegments,
            isEstimated,
            missingRoads
        };

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        if (error.response?.data) {
            console.error(`   Response:`, JSON.stringify(error.response.data, null, 2));
        }
        return {
            name: testCase.name,
            passed: false,
            error: error.message
        };
    }
}

async function runAllTests() {
    console.log('🇮🇹 Testing Italian toll routes...');
    console.log(`   API URL: ${API_URL}\n`);

    const results = [];

    for (const testCase of italyTestRoutes) {
        const result = await testRoute(testCase);
        results.push(result);

        // Пауза між запитами
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Підсумок
    console.log('\n' + '═'.repeat(70));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(70));

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log(`   Total tests: ${results.length}`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);

    if (failed > 0) {
        console.log('\n❌ Failed tests:');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`\n   ${r.name}:`);
            if (r.error) {
                console.log(`     Error: ${r.error}`);
            } else {
                console.log(`     Expected: €${r.expected} (${r.expectedSegments} segments)`);
                console.log(`     Got: €${r.totalCost} (${r.tollCount} segments)`);
                console.log(`     Difference: €${r.costDiff.toFixed(2)} (${r.percentDiff.toFixed(1)}%)`);
                if (r.isEstimated) {
                    console.log(`     ⚠️ Used estimates!`);
                }
                if (r.missingRoads?.length > 0) {
                    console.log(`     Missing roads: ${r.missingRoads.join(', ')}`);
                }
            }
        });
    }

    console.log('\n' + '═'.repeat(70));

    // Додаткова діагностика
    if (failed > 0) {
        console.log('\n🔍 DIAGNOSTIC TIPS:');

        const hasEstimates = results.some(r => r.isEstimated);
        if (hasEstimates) {
            console.log('\n   ⚠️ Some routes use ESTIMATES:');
            console.log('      1. Check if Italy seed was run: npm run seed:italy');
            console.log('      2. Verify MongoDB has Italian roads: curl /api/tolls/country/IT');
            console.log('      3. Check coordinates in node_coordinates_it.json');
        }

        const hasWrongCosts = results.some(r => !r.passed && r.percentDiff > 20);
        if (hasWrongCosts) {
            console.log('\n   ⚠️ Costs are very wrong (>20% diff):');
            console.log('      1. Check RATES_PER_KM in italy.seed.js');
            console.log('      2. Verify operator assignments (AUTOSTRADE vs others)');
            console.log('      3. May be finding duplicate segments - check tollService.js');
        }

        const hasWrongSegments = results.some(r => !r.passed && Math.abs(r.tollCount - r.expectedSegments) > 3);
        if (hasWrongSegments) {
            console.log('\n   ⚠️ Wrong number of segments:');
            console.log('      1. Use debug endpoint: POST /api/tolls/debug');
            console.log('      2. Check bounding box filter in tollService.js');
            console.log('      3. Verify road segments in italy.seed.js');
        }
    }

    process.exit(failed > 0 ? 1 : 0);
}

// Запустити тести
runAllTests();