// src/seeds/italy.seed.js
const mongoose = require('mongoose');
const TollRoad = require('../../models/TollRoad');
const NODE_COORDINATES = require('./node_coordinates_it.json');
require('dotenv').config();

/**
 * Репрезентативні середні ставки за км (EUR/km) по основних операторах.
 */
const RATES_PER_KM = {
    AUTOSTRADE: 0.110,
    SATAP: 0.106,
    A4HOLDING: 0.100,
    CAV: 0.095,
    AUTOBREN: 0.108,
    SERRAVALLE: 0.112,
    SALT: 0.115,
    CAS: 0.090
};

/** A1 — Autostrada del Sole: Milano → Napoli */
const A1 = [
    { from: 'Milan', to: 'Piacenza', lengthKm: 70, operator: 'AUTOSTRADE' },
    { from: 'Piacenza', to: 'Parma', lengthKm: 67, operator: 'AUTOSTRADE' },
    { from: 'Parma', to: 'Reggio Emilia', lengthKm: 30, operator: 'AUTOSTRADE' },
    { from: 'Reggio Emilia', to: 'Modena', lengthKm: 25, operator: 'AUTOSTRADE' },
    { from: 'Modena', to: 'Bologna', lengthKm: 40, operator: 'AUTOSTRADE' },
    { from: 'Bologna', to: 'Florence', lengthKm: 105, operator: 'AUTOSTRADE' },
    { from: 'Florence', to: 'Arezzo', lengthKm: 70, operator: 'AUTOSTRADE' },
    { from: 'Arezzo', to: 'Orvieto', lengthKm: 100, operator: 'AUTOSTRADE' },
    { from: 'Orvieto', to: 'Rome', lengthKm: 120, operator: 'AUTOSTRADE' },
    { from: 'Rome', to: 'Frosinone', lengthKm: 90, operator: 'AUTOSTRADE' },
    { from: 'Frosinone', to: 'Cassino', lengthKm: 55, operator: 'AUTOSTRADE' },
    { from: 'Cassino', to: 'Naples', lengthKm: 85, operator: 'AUTOSTRADE' }
].map(s => ({ ...s, roadNumber: 'A1', description: 'Autostrada del Sole' }));

/** A4 — Torino → Trieste */
const A4 = [
    { from: 'Turin', to: 'Milan', lengthKm: 125, operator: 'SATAP' },
    { from: 'Milan', to: 'Bergamo', lengthKm: 60, operator: 'AUTOSTRADE' },
    { from: 'Bergamo', to: 'Brescia', lengthKm: 50, operator: 'AUTOSTRADE' },
    { from: 'Brescia', to: 'Verona', lengthKm: 70, operator: 'A4HOLDING' },
    { from: 'Verona', to: 'Vicenza', lengthKm: 50, operator: 'A4HOLDING' },
    { from: 'Vicenza', to: 'Padua', lengthKm: 35, operator: 'A4HOLDING' },
    { from: 'Padua', to: 'Venice Mestre', lengthKm: 35, operator: 'CAV' },
    { from: 'Venice Mestre', to: 'Palmanova', lengthKm: 110, operator: 'CAV' },
    { from: 'Palmanova', to: 'Udine', lengthKm: 25, operator: 'CAV' },
    { from: 'Udine', to: 'Trieste', lengthKm: 80, operator: 'CAV' }
].map(s => ({ ...s, roadNumber: 'A4', description: 'Serenissima' }));

/** A7 — Milano → Genova */
const A7 = [
    { from: 'Milan', to: 'Alessandria', lengthKm: 85, operator: 'SERRAVALLE' },
    { from: 'Alessandria', to: 'Genoa', lengthKm: 60, operator: 'SERRAVALLE' }
].map(s => ({ ...s, roadNumber: 'A7', description: 'Milano–Genova' }));

/** A12 — Genova → Livorno */
const A12 = [
    { from: 'Genoa', to: 'Savona', lengthKm: 50, operator: 'SALT' },
    { from: 'Savona', to: 'Imperia', lengthKm: 75, operator: 'SALT' },
    { from: 'Imperia', to: 'Ventimiglia', lengthKm: 45, operator: 'SALT' },
    { from: 'Genoa', to: 'La Spezia', lengthKm: 95, operator: 'SALT' },
    { from: 'La Spezia', to: 'Carrara', lengthKm: 20, operator: 'SALT' },
    { from: 'Carrara', to: 'Lucca', lengthKm: 45, operator: 'SALT' },
    { from: 'Lucca', to: 'Pisa', lengthKm: 20, operator: 'SALT' },
    { from: 'Pisa', to: 'Livorno', lengthKm: 25, operator: 'SALT' }
].map(s => ({ ...s, roadNumber: 'A12', description: 'Autostrada Azzurra' }));

/** A14 — Bologna → Bari */
const A14 = [
    { from: 'Bologna', to: 'Ravenna', lengthKm: 75, operator: 'AUTOSTRADE' },
    { from: 'Ravenna', to: 'Cesena', lengthKm: 35, operator: 'AUTOSTRADE' },
    { from: 'Cesena', to: 'Rimini', lengthKm: 30, operator: 'AUTOSTRADE' },
    { from: 'Rimini', to: 'Pesaro', lengthKm: 45, operator: 'AUTOSTRADE' },
    { from: 'Pesaro', to: 'Ancona', lengthKm: 65, operator: 'AUTOSTRADE' },
    { from: 'Ancona', to: 'Pescara', lengthKm: 160, operator: 'AUTOSTRADE' },
    { from: 'Pescara', to: 'Foggia', lengthKm: 165, operator: 'AUTOSTRADE' },
    { from: 'Foggia', to: 'Bari', lengthKm: 130, operator: 'AUTOSTRADE' }
].map(s => ({ ...s, roadNumber: 'A14', description: 'Adriatica' }));

/** A22 — Modena → Brennero */
const A22 = [
    { from: 'Modena', to: 'Verona', lengthKm: 65, operator: 'AUTOBREN' },
    { from: 'Verona', to: 'Rovereto', lengthKm: 70, operator: 'AUTOBREN' },
    { from: 'Rovereto', to: 'Trento', lengthKm: 25, operator: 'AUTOBREN' },
    { from: 'Trento', to: 'Bolzano', lengthKm: 60, operator: 'AUTOBREN' },
    { from: 'Bolzano', to: 'Brenner', lengthKm: 85, operator: 'AUTOBREN' }
].map(s => ({ ...s, roadNumber: 'A22', description: 'Autobrennero' }));

/** A30 — Caserta → Salerno */
const A30 = [
    { from: 'Caserta', to: 'Avellino', lengthKm: 50, operator: 'AUTOSTRADE' },
    { from: 'Avellino', to: 'Salerno', lengthKm: 45, operator: 'AUTOSTRADE' }
].map(s => ({ ...s, roadNumber: 'A30', description: 'Raccordo Caserta–Salerno' }));

/** Sicily — CAS operator */
const A19 = [
    { from: 'Palermo', to: 'Enna', lengthKm: 120, operator: 'CAS' },
    { from: 'Enna', to: 'Catania', lengthKm: 70, operator: 'CAS' }
].map(s => ({ ...s, roadNumber: 'A19', description: 'Palermo–Catania' }));

const A20 = [
    { from: 'Messina', to: 'Patti', lengthKm: 65, operator: 'CAS' },
    { from: 'Patti', to: 'Cefalù', lengthKm: 75, operator: 'CAS' },
    { from: 'Cefalù', to: 'Palermo', lengthKm: 85, operator: 'CAS' }
].map(s => ({ ...s, roadNumber: 'A20', description: 'Messina–Palermo' }));

const A18 = [
    { from: 'Catania', to: 'Syracuse', lengthKm: 60, operator: 'CAS' }
].map(s => ({ ...s, roadNumber: 'A18', description: 'Catania–Siracusa' }));

const italyTollRoads = [
    ...A1, ...A4, ...A7, ...A12, ...A14, ...A22, ...A30, ...A19, ...A20, ...A18
];

function buildDoc(seg) {
    const ratePerKm = RATES_PER_KM[seg.operator];
    const basePrice = seg.lengthKm * ratePerKm;

    const fromCoords = NODE_COORDINATES[seg.from];
    const toCoords = NODE_COORDINATES[seg.to];

    if (!fromCoords || !toCoords) {
        console.error(`❌ MISSING COORDINATES: "${seg.from}" → "${seg.to}"`);
        console.error(`   Available cities in JSON:`, Object.keys(NODE_COORDINATES).slice(0, 10), '...');
        return null;
    }

    return {
        name: `${seg.roadNumber}: ${seg.from} → ${seg.to}`,
        country: 'IT',
        roadType: 'highway',
        roadNumber: seg.roadNumber,
        lengthKm: parseFloat(seg.lengthKm.toFixed(2)),
        geometry: { type: 'LineString', coordinates: [fromCoords, toCoords] },
        pricing: [
            {
                vehicleClass: 'car',
                price: parseFloat(basePrice.toFixed(2)),
                currency: 'EUR',
                pricingType: 'fixed',
                description: `${seg.operator}: ${ratePerKm} €/km × ${seg.lengthKm} km`
            },
            {
                vehicleClass: 'van',
                price: parseFloat((basePrice * 1.30).toFixed(2)),
                currency: 'EUR',
                pricingType: 'fixed',
                description: 'Class 2 vehicle'
            },
            {
                vehicleClass: 'truck',
                price: parseFloat((basePrice * 2.50).toFixed(2)),
                currency: 'EUR',
                pricingType: 'fixed',
                description: 'Class 3+ vehicle'
            },
            {
                vehicleClass: 'motorcycle',
                price: parseFloat((basePrice * 0.70).toFixed(2)),
                currency: 'EUR',
                pricingType: 'fixed',
                description: 'Motorcycle rate'
            }
        ],
        paymentMethods: ['cash', 'card', 'electronic_tag'],
        operator: seg.operator,
        etollSystem: true,
        active: true,
        description: seg.description || `Italian toll highway operated by ${seg.operator}`,
        updatedAt: new Date()
    };
}

async function seedItalyTolls() {
    let conn;
    try {
        conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB (Italy)');

        // Debug: Check what's in the coordinates file
        console.log(`📍 Loaded ${Object.keys(NODE_COORDINATES).length} city coordinates from JSON`);

        // Delete old Italian roads
        const del = await TollRoad.deleteMany({ country: 'IT' });
        console.log(`🗑️ Removed ${del.deletedCount} old Italian roads`);

        // Build documents
        const docs = italyTollRoads.map(buildDoc).filter(Boolean);

        const missingCount = italyTollRoads.length - docs.length;
        if (missingCount > 0) {
            console.error(`\n⚠️  WARNING: ${missingCount} segments skipped due to missing coordinates!`);
            console.error(`    Total segments defined: ${italyTollRoads.length}`);
            console.error(`    Valid documents created: ${docs.length}`);
        }

        if (docs.length === 0) {
            console.error('\n❌ FATAL: No valid documents to insert!');
            console.error('   Please check your node_coordinates_it.json file.');
            console.error('   Make sure city names match exactly (case-sensitive).');
            await mongoose.connection.close();
            process.exit(1);
        }

        // Debug: Log first document to see structure
        console.log('\n📝 Sample document (first):');
        console.log(JSON.stringify(docs[0], null, 2));

        // Insert with validation
        console.log('\n🔄 Inserting documents...');
        let result;
        try {
            // Try insertMany with ordered: true to catch first error
            result = await TollRoad.insertMany(docs, {
                ordered: true,
                rawResult: true
            });
            console.log(`✅ Inserted ${result.insertedCount || result.length} Italian toll segments`);
        } catch (insertError) {
            console.error('\n❌ InsertMany failed!');
            console.error('Error name:', insertError.name);
            console.error('Error message:', insertError.message);

            if (insertError.writeErrors && insertError.writeErrors.length > 0) {
                console.error('\nValidation errors:');
                insertError.writeErrors.slice(0, 3).forEach((err, idx) => {
                    console.error(`\n  Error ${idx + 1}:`);
                    console.error(`    Index: ${err.index}`);
                    console.error(`    Code: ${err.code}`);
                    console.error(`    Message: ${err.errmsg}`);
                });
            }

            // Try inserting one by one to find ALL problematic documents
            console.log('\n🔍 Attempting to insert documents one by one...');
            let successCount = 0;
            const failedDocs = [];

            for (let i = 0; i < docs.length; i++) {
                try {
                    await TollRoad.create(docs[i]);
                    successCount++;
                    if ((i + 1) % 10 === 0) {
                        console.log(`   Progress: ${i + 1}/${docs.length}...`);
                    }
                } catch (err) {
                    failedDocs.push({
                        index: i,
                        name: docs[i].name,
                        error: err.message
                    });
                }
            }

            console.log(`\n   ✅ Successfully inserted: ${successCount}/${docs.length}`);

            if (failedDocs.length > 0) {
                console.error(`   ❌ Failed documents: ${failedDocs.length}`);
                console.error('\nFirst 5 failures:');
                failedDocs.slice(0, 5).forEach(fail => {
                    console.error(`      ${fail.index}: ${fail.name}`);
                    console.error(`         Error: ${fail.error}\n`);
                });
            }

            result = { length: successCount };
        }

        // Statistics
        const totalLen = docs.reduce((s, r) => s + r.lengthKm, 0);
        const avgCar = docs.reduce((s, r) => s + r.pricing[0].price, 0) / docs.length;

        console.log('\n📊 Statistics:');
        console.log(`   Segments: ${docs.length}`);
        console.log(`   Total length: ${Math.round(totalLen)} km`);
        console.log(`   Avg car toll/segment: €${avgCar.toFixed(2)}`);

        // Tests
        const testA1 = docs.filter(d => d.roadNumber === 'A1');
        const milanToRome = testA1
            .filter(d => ['Milan', 'Piacenza', 'Parma', 'Reggio Emilia', 'Modena', 'Bologna', 'Florence', 'Arezzo', 'Orvieto', 'Rome'].some(x => d.name.includes(x)))
            .reduce((s, d) => s + d.pricing[0].price, 0);

        console.log(`\n🧪 Test A1 Milan → Rome (car): €${milanToRome.toFixed(2)}`);

        const testA4 = docs.filter(d => d.roadNumber === 'A4');
        const turinToVenice = testA4
            .filter(d => ['Turin', 'Milan', 'Bergamo', 'Brescia', 'Verona', 'Vicenza', 'Padua', 'Venice Mestre'].some(x => d.name.includes(x)))
            .reduce((s, d) => s + d.pricing[0].price, 0);
        console.log(`🧪 Test A4 Turin → Venice Mestre (car): €${turinToVenice.toFixed(2)}`);

        const testSicily = docs.filter(d => ['A19','A20','A18'].includes(d.roadNumber))
            .reduce((s, d) => s + d.lengthKm, 0);
        console.log(`🧪 Sicily network length (A18/A19/A20): ${Math.round(testSicily)} km`);

        await mongoose.connection.close();
        console.log('\n👋 Done seeding Italy!');
    } catch (err) {
        console.error('❌ Error seeding Italy:', err);
        if (conn) await mongoose.connection.close();
        process.exit(1);
    }
}

if (require.main === module) {
    seedItalyTolls();
}

module.exports = seedItalyTolls;