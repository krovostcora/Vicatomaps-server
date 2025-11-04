// scripts/debug-a7.js
const mongoose = require('mongoose');
const TollRoad = require('../src/models/TollRoad');
require('dotenv').config();

async function debugA7() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // 1. Перевірити чи A7 існує
        const a7Roads = await TollRoad.find({
            roadNumber: 'A7',
            country: 'IT'
        }).lean();

        console.log('📍 A7 segments in database:');
        a7Roads.forEach(road => {
            console.log(`   ${road.name}`);
            console.log(`   Coordinates: ${JSON.stringify(road.geometry.coordinates)}`);
            console.log(`   Price: €${road.pricing[0].price}\n`);
        });

        // 2. Створити маршрут Milano → Genova
        const route = [
            { lat: 45.4642, lng: 9.1900 },  // Milano
            { lat: 44.4056, lng: 8.9463 }   // Genova
        ];

        const routeLine = {
            type: 'LineString',
            coordinates: route.map(p => [p.lng, p.lat])
        };

        console.log('🗺️ Route:');
        console.log(`   From: Milano (${route[0].lat}, ${route[0].lng})`);
        console.log(`   To: Genova (${route[1].lat}, ${route[1].lng})`);
        console.log(`   Line: ${JSON.stringify(routeLine)}\n`);

        // 3. Спробувати geospatial query
        console.log('🔍 Testing geospatial query...');
        const geoResults = await TollRoad.find({
            geometry: {
                $geoIntersects: {
                    $geometry: routeLine
                }
            },
            country: 'IT',
            active: true
        }).lean();

        console.log(`   Found: ${geoResults.length} segments`);
        geoResults.forEach(road => {
            console.log(`   - ${road.name} (${road.roadNumber})`);
        });

        // 4. Перевірити чи A7 в результатах
        const hasA7 = geoResults.some(r => r.roadNumber === 'A7');
        console.log(`\n   ❓ A7 in results: ${hasA7 ? '✅ YES' : '❌ NO'}`);

        if (!hasA7) {
            console.log('\n⚠️ A7 NOT FOUND by geospatial query!');
            console.log('   Possible reasons:');
            console.log('   1. Coordinates are wrong');
            console.log('   2. Line does not intersect A7 segments');
            console.log('   3. MongoDB 2dsphere index issue');
        }

        // 5. Спробувати bounding box
        console.log('\n🔍 Testing bounding box query...');
        const lats = route.map(p => p.lat);
        const lngs = route.map(p => p.lng);

        const bbox = {
            minLat: Math.min(...lats) - 0.5,
            maxLat: Math.max(...lats) + 0.5,
            minLng: Math.min(...lngs) - 0.5,
            maxLng: Math.max(...lngs) + 0.5
        };

        console.log(`   Bounding box: ${JSON.stringify(bbox)}`);

        const bboxResults = await TollRoad.find({
            country: 'IT',
            roadNumber: 'A7',
            active: true
        }).lean();

        console.log(`\n   A7 segments coordinates:`);
        bboxResults.forEach(road => {
            const coords = road.geometry.coordinates;
            const inBox = coords.every(([lng, lat]) =>
                lat >= bbox.minLat && lat <= bbox.maxLat &&
                lng >= bbox.minLng && lng <= bbox.maxLng
            );
            console.log(`   ${road.name}`);
            console.log(`     Start: [${coords[0][0].toFixed(4)}, ${coords[0][1].toFixed(4)}]`);
            console.log(`     End: [${coords[1][0].toFixed(4)}, ${coords[1][1].toFixed(4)}]`);
            console.log(`     In bbox: ${inBox ? '✅' : '❌'}`);
        });

        // 6. Перевірити індекси
        console.log('\n📊 Checking indexes...');
        const indexes = await TollRoad.collection.getIndexes();
        const has2dsphere = Object.values(indexes).some(idx =>
            JSON.stringify(idx).includes('2dsphere')
        );
        console.log(`   2dsphere index exists: ${has2dsphere ? '✅' : '❌'}`);

        if (!has2dsphere) {
            console.log('\n⚠️ 2dsphere index MISSING!');
            console.log('   Creating index...');
            await TollRoad.collection.createIndex({ geometry: '2dsphere' });
            console.log('   ✅ Index created!');
        }

        // 7. Тест після створення індексу
        if (!has2dsphere) {
            console.log('\n🔍 Re-testing geospatial query after index creation...');
            const retestResults = await TollRoad.find({
                geometry: {
                    $geoIntersects: {
                        $geometry: routeLine
                    }
                },
                country: 'IT',
                roadNumber: 'A7',
                active: true
            }).lean();

            console.log(`   Found: ${retestResults.length} A7 segments`);
            const hasA7Now = retestResults.length > 0;
            console.log(`   A7 found: ${hasA7Now ? '✅ YES' : '❌ NO'}`);
        }

        await mongoose.connection.close();
        console.log('\n👋 Debug completed');

    } catch (error) {
        console.error('❌ Error:', error);
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }
        process.exit(1);
    }
}

debugA7();