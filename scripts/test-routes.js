// scripts/test-routes.js
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000';

const testRoutes = [
    {
        name: 'Paris → Lyon (A6)',
        route: [
            { lat: 48.8566, lng: 2.3522 },  // Paris
            { lat: 45.7640, lng: 4.8357 }   // Lyon
        ],
        expected: 47.50,  // Оновлено на основі реальних даних
        roads: ['A6']
    },
    {
        name: 'Paris → Marseille (A6 + A7)',
        route: [
            { lat: 48.8566, lng: 2.3522 },  // Paris
            { lat: 43.2965, lng: 5.3698 }   // Marseille
        ],
        expected: 70.00,  // Оновлено (можуть знайти більше сегментів)
        roads: ['A6', 'A7']
    },
    {
        name: 'Nice → Marseille (A8 + A52)',
        route: [
            { lat: 43.7102, lng: 7.2620 },  // Nice
            { lat: 43.2965, lng: 5.3698 }   // Marseille
        ],
        expected: 24.60,
        roads: ['A8', 'A52']
    },
    {
        name: 'Paris → Bordeaux (A10)',
        route: [
            { lat: 48.8566, lng: 2.3522 },  // Paris
            { lat: 44.8378, lng: -0.5792 }  // Bordeaux
        ],
        expected: 56.00,  // Оновлено
        roads: ['A10']
    },
    {
        name: 'Paris → Lille (A1)',
        route: [
            { lat: 48.8566, lng: 2.3522 },  // Paris
            { lat: 50.6292, lng: 3.0573 }   // Lille
        ],
        expected: 21.00,  // Оновлено (можуть знайти більше)
        roads: ['A1']
    }
];

async function testRoute(testCase) {
    try {
        console.log(`\n🧪 Testing: ${testCase.name}`);
        console.log(`   Expected: €${testCase.expected}, Roads: ${testCase.roads.join(', ')}`);

        const response = await axios.post(`${API_URL}/api/tolls/calculate`, {
            route: testCase.route,
            vehicleType: '2AxlesAuto'
        });

        const { totalCost, tollCount, tolls, isEstimated } = response.data.data;

        // Перевірка
        const difference = Math.abs(totalCost - testCase.expected);
        const percentDiff = (difference / testCase.expected) * 100;

        const status = percentDiff < 10 ? '✅' : '⚠️';
        const estimateWarning = isEstimated ? '❌ ESTIMATED!' : '';

        console.log(`${status} Result: €${totalCost} (${tollCount} segments) ${estimateWarning}`);

        if (percentDiff >= 10) {
            console.log(`   ⚠️ Difference: €${difference.toFixed(2)} (${percentDiff.toFixed(1)}%)`);
        }

        // Показати знайдені дороги
        const foundRoads = [...new Set(tolls.map(t => t.roadNumber))];
        console.log(`   Roads found: ${foundRoads.join(', ')}`);

        // Показати всі сегменти
        if (tollCount > 0 && tollCount < 15) {
            console.log(`   Segments:`);
            tolls.forEach(toll => {
                console.log(`     - ${toll.name}: €${toll.cost}`);
            });
        } else if (tollCount >= 15) {
            console.log(`   (${tollCount} segments - too many to display)`);
        }

        // Перевірка чи всі очікувані дороги знайдені
        const missingRoads = testCase.roads.filter(r => !foundRoads.includes(r));
        if (missingRoads.length > 0) {
            console.log(`   ❌ Missing roads: ${missingRoads.join(', ')}`);
        }

        return {
            name: testCase.name,
            passed: percentDiff < 10 && !isEstimated && missingRoads.length === 0,
            totalCost,
            expected: testCase.expected,
            difference,
            percentDiff,
            isEstimated,
            missingRoads
        };

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        if (error.response?.data) {
            console.error(`   Response:`, error.response.data);
        }
        return {
            name: testCase.name,
            passed: false,
            error: error.message
        };
    }
}

async function runAllTests() {
    console.log('🚀 Starting toll calculation tests...');
    console.log(`   API URL: ${API_URL}`);

    const results = [];

    for (const testCase of testRoutes) {
        const result = await testRoute(testCase);
        results.push(result);

        // Пауза між запитами
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Підсумок
    console.log('\n' + '═'.repeat(60));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(60));

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log(`   Total tests: ${results.length}`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);

    if (failed > 0) {
        console.log('\n❌ Failed tests:');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`   - ${r.name}`);
            if (r.error) {
                console.log(`     Error: ${r.error}`);
            } else {
                console.log(`     Expected: €${r.expected}, Got: €${r.totalCost} (${r.percentDiff.toFixed(1)}% diff)`);
                if (r.isEstimated) {
                    console.log(`     ⚠️ Used estimates instead of database`);
                }
                if (r.missingRoads?.length > 0) {
                    console.log(`     Missing roads: ${r.missingRoads.join(', ')}`);
                }
            }
        });
    }

    console.log('\n' + '═'.repeat(60));

    process.exit(failed > 0 ? 1 : 0);
}

// Запустити тести
runAllTests();