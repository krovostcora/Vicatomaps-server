const mongoose = require('mongoose');
const TollRoad = require('../models/TollRoad');
const NODE_COORDINATES = require('./node_coordinates_fr.json');
require('dotenv').config();

// Французькі ставки (EUR за км) для різних операторів
const RATES_PER_KM = {
    'APRR': 0.095,      // A6, A31, A36
    'SANEF': 0.088,     // A1, A4, A13, A26
    'VINCI': 0.092,     // A10, A11, A61, A62, A63, A64
    'ESCOTA': 0.105,    // A8, A50, A57 (дорожчі через гори)
    'ASF': 0.091,       // A7, A9, A20, A62
    'AREA': 0.089,      // A40, A41, A43
    'ATMB': 0.110       // A410, тунелі (найдорожчі)
};

const franceTollRoads = [
    // ═══════════════════════════════════════════════════════════
    // A6 - Autoroute du Soleil (Paris → Lyon) - APRR
    // Один з головних маршрутів, ДЕТАЛЬНІ СЕГМЕНТИ
    // ═══════════════════════════════════════════════════════════
    {
        lengthKm: 35,
        from: 'Paris Porte d\'Italie',
        to: 'Évry',
        roadNumber: 'A6',
        operator: 'APRR',
        description: 'Paris périphérique exit to southern suburbs'
    },
    {
        lengthKm: 50,
        from: 'Évry',
        to: 'Fontainebleau',
        roadNumber: 'A6',
        operator: 'APRR'
    },
    {
        lengthKm: 95,
        from: 'Fontainebleau',
        to: 'Auxerre',
        roadNumber: 'A6',
        operator: 'APRR'
    },
    {
        lengthKm: 140,
        from: 'Auxerre',
        to: 'Beaune',
        roadNumber: 'A6',
        operator: 'APRR',
        description: 'Through Burgundy wine region'
    },
    {
        lengthKm: 45,
        from: 'Beaune',
        to: 'Chalon-sur-Saône',
        roadNumber: 'A6',
        operator: 'APRR'
    },
    {
        lengthKm: 65,
        from: 'Chalon-sur-Saône',
        to: 'Mâcon',
        roadNumber: 'A6',
        operator: 'APRR'
    },
    {
        lengthKm: 40,
        from: 'Mâcon',
        to: 'Villefranche-sur-Saône',
        roadNumber: 'A6',
        operator: 'APRR'
    },
    {
        lengthKm: 30,
        from: 'Villefranche-sur-Saône',
        to: 'Lyon Perrache',
        roadNumber: 'A6',
        operator: 'APRR',
        description: 'Entry to Lyon metropolitan area'
    },

    // ═══════════════════════════════════════════════════════════
    // A7 - Autoroute du Soleil Sud (Lyon → Marseille) - ASF
    // ═══════════════════════════════════════════════════════════
    {
        lengthKm: 25,
        from: 'Lyon Confluence',
        to: 'Vienne',
        roadNumber: 'A7',
        operator: 'ASF'
    },
    {
        lengthKm: 75,
        from: 'Vienne',
        to: 'Valence',
        roadNumber: 'A7',
        operator: 'ASF',
        description: 'Along Rhône valley'
    },
    {
        lengthKm: 85,
        from: 'Valence',
        to: 'Montélimar',
        roadNumber: 'A7',
        operator: 'ASF'
    },
    {
        lengthKm: 65,
        from: 'Montélimar',
        to: 'Orange',
        roadNumber: 'A7',
        operator: 'ASF'
    },
    {
        lengthKm: 30,
        from: 'Orange',
        to: 'Avignon',
        roadNumber: 'A7',
        operator: 'ASF'
    },
    {
        lengthKm: 85,
        from: 'Avignon',
        to: 'Aix-en-Provence',
        roadNumber: 'A7',
        operator: 'ASF'
    },
    {
        lengthKm: 30,
        from: 'Aix-en-Provence',
        to: 'Marseille Saint-Charles',
        roadNumber: 'A7',
        operator: 'ASF'
    },

    // ═══════════════════════════════════════════════════════════
    // A10 - L'Aquitaine (Paris → Bordeaux) - VINCI
    // ДУЖЕ ДОВГА, детальні сегменти
    // ═══════════════════════════════════════════════════════════
    {
        lengthKm: 40,
        from: 'Paris Porte d\'Orléans',
        to: 'Évry',
        roadNumber: 'A10',
        operator: 'VINCI'
    },
    {
        lengthKm: 90,
        from: 'Évry',
        to: 'Orléans',
        roadNumber: 'A10',
        operator: 'VINCI'
    },
    {
        lengthKm: 60,
        from: 'Orléans',
        to: 'Blois',
        roadNumber: 'A10',
        operator: 'VINCI',
        description: 'Through Loire Valley châteaux region'
    },
    {
        lengthKm: 55,
        from: 'Blois',
        to: 'Tours',
        roadNumber: 'A10',
        operator: 'VINCI'
    },
    {
        lengthKm: 105,
        from: 'Tours',
        to: 'Poitiers',
        roadNumber: 'A10',
        operator: 'VINCI'
    },
    {
        lengthKm: 75,
        from: 'Poitiers',
        to: 'Niort',
        roadNumber: 'A10',
        operator: 'VINCI'
    },
    {
        lengthKm: 65,
        from: 'Niort',
        to: 'Saintes',
        roadNumber: 'A10',
        operator: 'VINCI'
    },
    {
        lengthKm: 120,
        from: 'Saintes',
        to: 'Bordeaux Centre',
        roadNumber: 'A10',
        operator: 'VINCI'
    },

    // ═══════════════════════════════════════════════════════════
    // A1 - Autoroute du Nord (Paris → Lille) - SANEF
    // ═══════════════════════════════════════════════════════════
    {
        lengthKm: 60,
        from: 'Paris Porte de la Chapelle',
        to: 'Senlis',
        roadNumber: 'A1',
        operator: 'SANEF'
    },
    {
        lengthKm: 75,
        from: 'Senlis',
        to: 'Péronne',
        roadNumber: 'A1',
        operator: 'SANEF'
    },
    {
        lengthKm: 45,
        from: 'Péronne',
        to: 'Cambrai',
        roadNumber: 'A1',
        operator: 'SANEF'
    },
    {
        lengthKm: 35,
        from: 'Cambrai',
        to: 'Douai',
        roadNumber: 'A1',
        operator: 'SANEF'
    },
    {
        lengthKm: 25,
        from: 'Douai',
        to: 'Lille Centre',
        roadNumber: 'A1',
        operator: 'SANEF'
    },

    // ═══════════════════════════════════════════════════════════
    // A4 - L'Est (Paris → Strasbourg) - SANEF
    // ═══════════════════════════════════════════════════════════
    {
        lengthKm: 170,
        from: 'Paris Porte de Bercy',
        to: 'Reims',
        roadNumber: 'A4',
        operator: 'SANEF'
    },
    {
        lengthKm: 145,
        from: 'Reims',
        to: 'Metz',
        roadNumber: 'A4',
        operator: 'SANEF'
    },
    {
        lengthKm: 160,
        from: 'Metz',
        to: 'Strasbourg Centre',
        roadNumber: 'A4',
        operator: 'SANEF'
    },

    // ═══════════════════════════════════════════════════════════
    // A13 - Autoroute de Normandie (Paris → Caen) - SANEF
    // ═══════════════════════════════════════════════════════════
    {
        lengthKm: 50,
        from: 'Paris La Défense',
        to: 'Mantes-la-Jolie',
        roadNumber: 'A13',
        operator: 'SANEF'
    },
    {
        lengthKm: 95,
        from: 'Mantes-la-Jolie',
        to: 'Rouen',
        roadNumber: 'A13',
        operator: 'SANEF'
    },
    {
        lengthKm: 50,
        from: 'Rouen',
        to: 'Lisieux',
        roadNumber: 'A13',
        operator: 'SANEF'
    },
    {
        lengthKm: 45,
        from: 'Lisieux',
        to: 'Caen Centre',
        roadNumber: 'A13',
        operator: 'SANEF'
    },

    // ═══════════════════════════════════════════════════════════
    // A8 - La Provençale (Aix → Nice) - ESCOTA (дорога)
    // ═══════════════════════════════════════════════════════════
    {
        lengthKm: 55,
        from: 'Aix-en-Provence',
        to: 'Toulon',
        roadNumber: 'A8',
        operator: 'ESCOTA'
    },
    {
        lengthKm: 50,
        from: 'Toulon',
        to: 'Fréjus',
        roadNumber: 'A8',
        operator: 'ESCOTA',
        description: 'Coastal route with viaducts'
    },
    {
        lengthKm: 35,
        from: 'Fréjus',
        to: 'Cannes',
        roadNumber: 'A8',
        operator: 'ESCOTA'
    },
    {
        lengthKm: 30,
        from: 'Cannes',
        to: 'Nice Promenade',
        roadNumber: 'A8',
        operator: 'ESCOTA',
        description: 'French Riviera section, expensive'
    },

    // ═══════════════════════════════════════════════════════════
    // A61 - Autoroute des Deux Mers (Toulouse → Narbonne) - VINCI
    // ═══════════════════════════════════════════════════════════
    {
        lengthKm: 90,
        from: 'Toulouse Blagnac',
        to: 'Carcassonne',
        roadNumber: 'A61',
        operator: 'VINCI'
    },
    {
        lengthKm: 60,
        from: 'Carcassonne',
        to: 'Narbonne',
        roadNumber: 'A61',
        operator: 'VINCI'
    },

    // ═══════════════════════════════════════════════════════════
    // A9 - La Languedocienne (Narbonne → Spanish border) - ASF
    // ═══════════════════════════════════════════════════════════
    {
        lengthKm: 40,
        from: 'Narbonne',
        to: 'Béziers',
        roadNumber: 'A9',
        operator: 'ASF'
    },
    {
        lengthKm: 70,
        from: 'Béziers',
        to: 'Montpellier',
        roadNumber: 'A9',
        operator: 'ASF'
    },
    {
        lengthKm: 55,
        from: 'Montpellier',
        to: 'Nîmes',
        roadNumber: 'A9',
        operator: 'ASF'
    }
];

async function seedFranceTolls() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const tollDocuments = franceTollRoads.map(road => {
            const ratePerKm = RATES_PER_KM[road.operator] || 0.09;
            const basePrice = road.lengthKm * ratePerKm;

            // Отримати координати
            const fromCoords = NODE_COORDINATES[road.from];
            const toCoords = NODE_COORDINATES[road.to];

            if (!fromCoords || !toCoords) {
                console.warn(`⚠️ Missing coordinates for: ${road.from} → ${road.to}`);
                return null;
            }

            if (fromCoords[0] === toCoords[0] && fromCoords[1] === toCoords[1]) {
                console.warn(`⚠️ Identical coordinates for: ${road.from} → ${road.to}`);
                return null;
            }

            return {
                name: `${road.roadNumber}: ${road.from} → ${road.to}`,
                country: 'FR',
                roadType: 'highway',
                roadNumber: road.roadNumber,
                lengthKm: parseFloat(road.lengthKm.toFixed(2)),
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
                        description: `${road.operator}: ${ratePerKm} EUR/km × ${road.lengthKm}km`
                    },
                    {
                        vehicleClass: 'van',
                        price: parseFloat((basePrice * 1.3).toFixed(2)),
                        currency: 'EUR',
                        pricingType: 'fixed',
                        description: 'Class 2 vehicle'
                    },
                    {
                        vehicleClass: 'truck',
                        price: parseFloat((basePrice * 2.5).toFixed(2)),
                        currency: 'EUR',
                        pricingType: 'fixed',
                        description: 'Class 3+ vehicle'
                    },
                    {
                        vehicleClass: 'motorcycle',
                        price: parseFloat((basePrice * 0.7).toFixed(2)),
                        currency: 'EUR',
                        pricingType: 'fixed',
                        description: 'Motorcycle rate'
                    }
                ],
                paymentMethods: ['cash', 'card', 'electronic_tag'],
                operator: road.operator,
                active: true,
                etollSystem: false,
                description: road.description || `French toll highway operated by ${road.operator}`,
                updatedAt: new Date()
            };
        }).filter(doc => doc !== null);

        // Видалити старі французькі дороги
        const deleteResult = await TollRoad.deleteMany({ country: 'FR' });
        console.log(`🗑️ Cleared ${deleteResult.deletedCount} existing French toll roads`);

        // Додати нові
        const result = await TollRoad.insertMany(tollDocuments);
        console.log(`✅ Inserted ${result.length} French toll road segments`);

        // Детальна статистика
        const stats = {
            byRoad: {},
            byOperator: {},
            totalLength: 0,
            avgPrice: 0
        };

        tollDocuments.forEach(road => {
            // По дорогах
            stats.byRoad[road.roadNumber] = (stats.byRoad[road.roadNumber] || 0) + 1;

            // По операторах
            stats.byOperator[road.operator] = (stats.byOperator[road.operator] || 0) + 1;

            // Загальна довжина
            stats.totalLength += road.lengthKm;

            // Середня ціна
            stats.avgPrice += road.pricing[0].price;
        });

        stats.avgPrice = (stats.avgPrice / tollDocuments.length).toFixed(2);

        console.log('\n📊 Statistics:');
        console.log(`   Total segments: ${result.length}`);
        console.log(`   Total length: ${stats.totalLength.toFixed(0)} km`);
        console.log(`   Average toll: €${stats.avgPrice}`);

        console.log('\n🛣️ By Road:');
        Object.entries(stats.byRoad)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([road, count]) => {
                console.log(`   ${road}: ${count} segments`);
            });

        console.log('\n🏢 By Operator:');
        Object.entries(stats.byOperator)
            .sort(([,a], [,b]) => b - a)
            .forEach(([operator, count]) => {
                console.log(`   ${operator}: ${count} segments`);
            });

        // Перевірка для Paris → Lyon
        const parisLyonSegments = tollDocuments.filter(road =>
            road.roadNumber === 'A6' ||
            (road.roadNumber === 'A7' && road.name.includes('Lyon'))
        );

        const parisLyonTotal = parisLyonSegments.reduce((sum, seg) =>
            sum + seg.pricing[0].price, 0
        );

        console.log('\n🧪 Test Route (Paris → Lyon via A6):');
        console.log(`   Segments: ${parisLyonSegments.length}`);
        console.log(`   Total cost: €${parisLyonTotal.toFixed(2)} (expected ~€40.90)`);

        await mongoose.connection.close();
        console.log('\n👋 Done!');

    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

// Запустити тільки якщо викликано напряму
if (require.main === module) {
    seedFranceTolls();
}

module.exports = seedFranceTolls;