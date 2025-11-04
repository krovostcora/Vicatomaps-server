// scripts/test-country-detection.js
const geospatial = require('../src/utils/geospatial');

const testCases = [
    {
        name: 'Milano → Genova',
        route: [
            { lat: 45.4642, lng: 9.1900 },  // Milano
            { lat: 44.4056, lng: 8.9463 }   // Genova
        ],
        expected: ['IT']
    },
    {
        name: 'Milano → Roma',
        route: [
            { lat: 45.4642, lng: 9.1900 },  // Milano
            { lat: 41.9028, lng: 12.4964 }  // Roma
        ],
        expected: ['IT']
    },
    {
        name: 'Paris → Lyon',
        route: [
            { lat: 48.8566, lng: 2.3522 },  // Paris
            { lat: 45.7640, lng: 4.8357 }   // Lyon
        ],
        expected: ['FR']
    },
    {
        name: 'Paris → Milano (cross-border)',
        route: [
            { lat: 48.8566, lng: 2.3522 },  // Paris
            { lat: 45.4642, lng: 9.1900 }   // Milano
        ],
        expected: ['FR', 'IT']  // Може також включати CH
    },
    {
        name: 'Vilnius → Warsaw',
        route: [
            { lat: 54.6872, lng: 25.2797 },  // Vilnius
            { lat: 52.2297, lng: 21.0122 }   // Warsaw
        ],
        expected: ['LT', 'PL']
    },
    {
        name: 'Turin → Venice',
        route: [
            { lat: 45.0703, lng: 7.6869 },  // Turin
            { lat: 45.4408, lng: 12.3155 }  // Venice
        ],
        expected: ['IT']
    }
];

console.log('🗺️ Testing country detection...\n');

let passed = 0;
let failed = 0;

testCases.forEach(test => {
    const detected = geospatial.detectCountries(test.route);
    const isCorrect = JSON.stringify(detected.sort()) === JSON.stringify(test.expected.sort());

    const status = isCorrect ? '✅' : '❌';

    console.log(`${status} ${test.name}`);
    console.log(`   Expected: ${test.expected.join(', ')}`);
    console.log(`   Detected: ${detected.join(', ')}`);

    if (!isCorrect) {
        console.log(`   ⚠️ MISMATCH!`);
        failed++;
    } else {
        passed++;
    }
    console.log('');
});

console.log('═'.repeat(50));
console.log(`📊 Results: ${passed}/${testCases.length} passed`);

if (failed > 0) {
    console.log(`\n⚠️ ${failed} test(s) failed!`);
    console.log('Check country bounds in geospatial.js');
    process.exit(1);
} else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
}