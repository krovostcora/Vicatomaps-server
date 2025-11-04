// src/seeds/italy.seed.js
const mongoose = require('mongoose');
const TollRoad = require('../../models/TollRoad');
const NODE_COORDINATES = require('./node_coordinates_it.json');
require('dotenv').config();

/**
 * Італійські ставки за км (EUR/km) по операторах
 * Базується на реальних тарифах 2024-2025
 */
const RATES_PER_KM = {
    AUTOSTRADE: 0.075,   // Основний оператор (знижено з 0.110)
    SATAP: 0.073,        // Turin-Milan area
    A4HOLDING: 0.072,    // Brescia-Padova
    CAV: 0.068,          // Venezia area
    AUTOBREN: 0.065,     // Brennero (знижено)
    SERRAVALLE: 0.077,   // Milan-Genoa
    SALT: 0.080,         // Liguria (дорожче через тунелі)
    CAS: 0.050           // Sicily (дешевше)
};

/**
 * A1 – Autostrada del Sole: Milano → Napoli
 * ПОВНА ВЕРСІЯ з усіма сегментами
 */
const A1 = [
    // Milano → Bologna
    { from: 'Melegnano', to: 'Lodi', lengthKm: 20, operator: 'AUTOSTRADE' },
    { from: 'Lodi', to: 'Piacenza', lengthKm: 40, operator: 'AUTOSTRADE' },
    { from: 'Piacenza', to: 'Parma', lengthKm: 50, operator: 'AUTOSTRADE' },
    { from: 'Parma', to: 'Reggio Emilia', lengthKm: 35, operator: 'AUTOSTRADE' },
    { from: 'Reggio Emilia', to: 'Modena', lengthKm: 25, operator: 'AUTOSTRADE' },
    { from: 'Modena', to: 'Bologna', lengthKm: 45, operator: 'AUTOSTRADE' },

    // Bologna → Roma
    { from: 'Bologna', to: 'Imola', lengthKm: 35, operator: 'AUTOSTRADE' },
    { from: 'Imola', to: 'Florence', lengthKm: 70, operator: 'AUTOSTRADE' },
    { from: 'Florence', to: 'Arezzo', lengthKm: 65, operator: 'AUTOSTRADE' },
    { from: 'Arezzo', to: 'Chiusi', lengthKm: 55, operator: 'AUTOSTRADE' },
    { from: 'Chiusi', to: 'Orvieto', lengthKm: 60, operator: 'AUTOSTRADE' },
    { from: 'Orvieto', to: 'Orte', lengthKm: 45, operator: 'AUTOSTRADE' },
    { from: 'Orte', to: 'Rome', lengthKm: 70, operator: 'AUTOSTRADE' },

    // Roma → Napoli (ЦІ СЕГМЕНТИ БУЛИ ПРОПУЩЕНІ!)
    { from: 'Rome', to: 'Frosinone', lengthKm: 80, operator: 'AUTOSTRADE' },
    { from: 'Frosinone', to: 'Cassino', lengthKm: 55, operator: 'AUTOSTRADE' },
    { from: 'Cassino', to: 'Caserta', lengthKm: 50, operator: 'AUTOSTRADE' },
    { from: 'Caserta', to: 'Naples', lengthKm: 35, operator: 'AUTOSTRADE' }
].map(s => ({ ...s, roadNumber: 'A1', description: 'Autostrada del Sole' }));

/**
 * A4 – Torino → Trieste (Serenissima)
 */
const A4 = [
    // Torino → Milano
    { from: 'Turin', to: 'Chivasso', lengthKm: 30, operator: 'SATAP' },
    { from: 'Chivasso', to: 'Novara', lengthKm: 55, operator: 'SATAP' },
    { from: 'Novara', to: 'Milan', lengthKm: 45, operator: 'SATAP' },

    // Milano → Venezia
    { from: 'Pero', to: 'Bergamo', lengthKm: 60, operator: 'AUTOSTRADE' },
    { from: 'Bergamo', to: 'Brescia', lengthKm: 50, operator: 'AUTOSTRADE' },
    { from: 'Brescia', to: 'Desenzano', lengthKm: 40, operator: 'A4HOLDING' },
    { from: 'Desenzano', to: 'Verona', lengthKm: 45, operator: 'A4HOLDING' },
    { from: 'Verona', to: 'Vicenza', lengthKm: 50, operator: 'A4HOLDING' },
    { from: 'Vicenza', to: 'Padua', lengthKm: 35, operator: 'A4HOLDING' },
    { from: 'Padua', to: 'Venice Mestre', lengthKm: 35, operator: 'CAV' },

    // Venezia → Trieste
    { from: 'Venice Mestre', to: 'San Donà di Piave', lengthKm: 35, operator: 'CAV' },
    { from: 'San Donà di Piave', to: 'Portogruaro', lengthKm: 35, operator: 'CAV' },
    { from: 'Portogruaro', to: 'Palmanova', lengthKm: 40, operator: 'CAV' },
    { from: 'Palmanova', to: 'Udine', lengthKm: 25, operator: 'CAV' },
    { from: 'Udine', to: 'Trieste', lengthKm: 80, operator: 'CAV' }
].map(s => ({ ...s, roadNumber: 'A4', description: 'Serenissima' }));

/**
 * A7 – Milano → Genova (через Serravalle)
 * ВАЖЛИВО: Починається з Assago (південний вихід з Milano)
 */
const A7 = [
    { from: 'Assago', to: 'Tortona', lengthKm: 50, operator: 'SERRAVALLE' },
    { from: 'Tortona', to: 'Serravalle Scrivia', lengthKm: 20, operator: 'SERRAVALLE' },
    { from: 'Serravalle Scrivia', to: 'Busalla', lengthKm: 35, operator: 'SERRAVALLE' },
    { from: 'Busalla', to: 'Genoa', lengthKm: 40, operator: 'SERRAVALLE' }
].map(s => ({ ...s, roadNumber: 'A7', description: 'Milano–Genova' }));

/**
 * A26 – Genova Voltri → Gravellona Toce (альтернативний маршрут до Genoa)
 */
const A26 = [
    { from: 'Genoa', to: 'Ovada', lengthKm: 45, operator: 'SALT' },
    { from: 'Ovada', to: 'Alessandria', lengthKm: 35, operator: 'SALT' },
    { from: 'Alessandria', to: 'Asti', lengthKm: 40, operator: 'SALT' }
].map(s => ({ ...s, roadNumber: 'A26', description: 'Genova–Gravellona' }));

/**
 * A12 – Genova → Livorno (Лігурійське узбережжя)
 */
const A12 = [
    // Західний напрямок (до Франції)
    { from: 'Genoa', to: 'Savona', lengthKm: 50, operator: 'SALT' },
    { from: 'Savona', to: 'Imperia', lengthKm: 75, operator: 'SALT' },
    { from: 'Imperia', to: 'Ventimiglia', lengthKm: 45, operator: 'SALT' },

    // Східний напрямок (Toscana)
    { from: 'Genoa', to: 'La Spezia', lengthKm: 95, operator: 'SALT' },
    { from: 'La Spezia', to: 'Carrara', lengthKm: 20, operator: 'SALT' },
    { from: 'Carrara', to: 'Lucca', lengthKm: 45, operator: 'SALT' },
    { from: 'Lucca', to: 'Pisa', lengthKm: 20, operator: 'SALT' },
    { from: 'Pisa', to: 'Livorno', lengthKm: 25, operator: 'SALT' }
].map(s => ({ ...s, roadNumber: 'A12', description: 'Autostrada Azzurra' }));

/**
 * A14 – Bologna → Bari (Adriatica)
 * КРИТИЧНО: Це найдовша дорога, перевірити координати!
 */
const A14 = [
    { from: 'Bologna', to: 'Imola', lengthKm: 35, operator: 'AUTOSTRADE' },
    { from: 'Imola', to: 'Cesena', lengthKm: 45, operator: 'AUTOSTRADE' },
    { from: 'Cesena', to: 'Rimini', lengthKm: 30, operator: 'AUTOSTRADE' },
    { from: 'Rimini', to: 'Pesaro', lengthKm: 35, operator: 'AUTOSTRADE' },
    { from: 'Pesaro', to: 'Ancona', lengthKm: 70, operator: 'AUTOSTRADE' },
    { from: 'Ancona', to: 'Pescara', lengthKm: 160, operator: 'AUTOSTRADE' },
    { from: 'Pescara', to: 'Foggia', lengthKm: 180, operator: 'AUTOSTRADE' },
    { from: 'Foggia', to: 'Canosa di Puglia', lengthKm: 60, operator: 'AUTOSTRADE' },
    { from: 'Canosa di Puglia', to: 'Bari', lengthKm: 65, operator: 'AUTOSTRADE' }
].map(s => ({ ...s, roadNumber: 'A14', description: 'Adriatica' }));

/**
 * A22 – Modena → Brennero (Autobrennero)
 */
const A22 = [
    { from: 'Modena', to: 'Carpi', lengthKm: 25, operator: 'AUTOBREN' },
    { from: 'Carpi', to: 'Verona', lengthKm: 55, operator: 'AUTOBREN' },
    { from: 'Verona', to: 'Rovereto', lengthKm: 65, operator: 'AUTOBREN' },
    { from: 'Rovereto', to: 'Trento', lengthKm: 25, operator: 'AUTOBREN' },
    { from: 'Trento', to: 'Bolzano', lengthKm: 60, operator: 'AUTOBREN' },
    { from: 'Bolzano', to: 'Brenner', lengthKm: 65, operator: 'AUTOBREN' }
].map(s => ({ ...s, roadNumber: 'A22', description: 'Autobrennero' }));

/**
 * A30 – Caserta → Salerno (зв'язка)
 */
const A30 = [
    { from: 'Caserta', to: 'Avellino', lengthKm: 50, operator: 'AUTOSTRADE' },
    { from: 'Avellino', to: 'Salerno', lengthKm: 45, operator: 'AUTOSTRADE' }
].map(s => ({ ...s, roadNumber: 'A30', description: 'Caserta–Salerno' }));

/**
 * Сицилія – CAS (дешевші дороги)
 */
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

/** Зведення всіх трас */
const italyTollRoads = [
    ...A1,
    ...A4,
    ...A7,
    ...A26,
    ...A12,
    ...A14,
    ...A22,
    ...A30,
    ...A19,
    ...A20,
    ...A18
];

function buildDoc(seg) {
    const ratePerKm = RATES_PER_KM[seg.operator];
    const basePrice = seg.lengthKm * ratePerKm;

    const fromCoords = NODE_COORDINATES[seg.from];
    const toCoords = NODE_COORDINATES[seg.to];

    if (!fromCoords || !toCoords) {
        console.warn(`⚠️ MISSING COORDINATES: "${seg.from}" → "${seg.to}"`);
        return null;
    }

    return {
        name: `${seg.roadNumber}: ${seg.from} → ${seg.to}`,
        country: 'IT',
        roadType: 'highway',
        roadNumber: seg.roadNumber,
        lengthKm: parseFloat(seg.lengthKm.toFixed(2)),
        geometry: {
            type: 'LineString',
            coordinates: [fromCoords, toCoords]
        },
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
                pricingType: 'fixed'
            },
            {
                vehicleClass: 'truck',
                price: parseFloat((basePrice * 2.50).toFixed(2)),
                currency: 'EUR',
                pricingType: 'fixed'
            },
            {
                vehicleClass: 'motorcycle',
                price: parseFloat((basePrice * 0.70).toFixed(2)),
                currency: 'EUR',
                pricingType: 'fixed'
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
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB (Italy)');

        console.log(`📁 Loaded ${Object.keys(NODE_COORDINATES).length} city coordinates`);

        // Видалити старі італійські дороги
        const deleteResult = await TollRoad.deleteMany({ country: 'IT' });
        console.log(`🗑️ Removed ${deleteResult.deletedCount} old Italian roads`);

        // Створити документи
        const docs = italyTollRoads.map(buildDoc).filter(Boolean);

        const missingCount = italyTollRoads.length - docs.length;
        if (missingCount > 0) {
            console.warn(`\n⚠️ ${missingCount} segments skipped (missing coordinates)`);
        }

        if (docs.length === 0) {
            throw new Error('No valid documents to insert!');
        }

        // Вставити в базу
        const result = await TollRoad.insertMany(docs);
        console.log(`✅ Inserted ${result.length} Italian toll segments`);

        // Статистика
        const totalLen = docs.reduce((s, r) => s + r.lengthKm, 0);
        const totalCost = docs.reduce((s, r) => s + r.pricing[0].price, 0);
        const avgCar = totalCost / docs.length;

        console.log('\n📊 Statistics:');
        console.log(`   Segments: ${docs.length}`);
        console.log(`   Total length: ${Math.round(totalLen)} km`);
        console.log(`   Total cost (all segments): €${totalCost.toFixed(2)}`);
        console.log(`   Avg per segment: €${avgCar.toFixed(2)}`);

        // Групування по дорогах
        const byRoad = {};
        docs.forEach(doc => {
            if (!byRoad[doc.roadNumber]) {
                byRoad[doc.roadNumber] = { count: 0, length: 0, cost: 0 };
            }
            byRoad[doc.roadNumber].count++;
            byRoad[doc.roadNumber].length += doc.lengthKm;
            byRoad[doc.roadNumber].cost += doc.pricing[0].price;
        });

        console.log('\n🛣️ By Road:');
        Object.entries(byRoad)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([road, stats]) => {
                console.log(`   ${road}: ${stats.count} segments, ${Math.round(stats.length)}km, €${stats.cost.toFixed(2)}`);
            });

        // Тести конкретних маршрутів
        console.log('\n🧪 Expected costs (car):');
        console.log(`   A1 Milano → Roma: €${(byRoad.A1.length * RATES_PER_KM.AUTOSTRADE).toFixed(2)} (${Math.round(byRoad.A1.length)}km)`);
        console.log(`   A4 Torino → Venezia: €${(byRoad.A4.length * 0.070).toFixed(2)} (${Math.round(byRoad.A4.length)}km)`);
        console.log(`   A14 Bologna → Bari: €${(byRoad.A14.length * RATES_PER_KM.AUTOSTRADE).toFixed(2)} (${Math.round(byRoad.A14.length)}km)`);
        console.log(`   A7 Milano → Genova: €${(byRoad.A7.length * RATES_PER_KM.SERRAVALLE).toFixed(2)} (${Math.round(byRoad.A7.length)}km)`);

        await mongoose.connection.close();
        console.log('\n👋 Done seeding Italy!');

    } catch (err) {
        console.error('❌ Error seeding Italy:', err);
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }
        process.exit(1);
    }
}

if (require.main === module) {
    seedItalyTolls();
}

module.exports = seedItalyTolls;