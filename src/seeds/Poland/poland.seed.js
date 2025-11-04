const mongoose = require('mongoose');
const TollRoad = require('../../models/TollRoad');
const NODE_COORDINATES = require('./node_coordinates_pl.json');
require('dotenv').config();

// Ставки за категоріями (PLN за км для легкового авто)
const RATES_PER_KM = {
    'A': 0.40,  // Autostrada
    'S': 0.20,  // Droga ekspresowa
    'G': 0.10   // Droga krajowa
};


const duplicates = Object.entries(NODE_COORDINATES)
    .reduce((acc, [name, coords]) => {
        const key = coords.join(',');
        acc[key] = acc[key] || [];
        acc[key].push(name);
        return acc;
    }, {});
console.log('⚠️ Possible duplicate coordinates:', Object.values(duplicates).filter(v => v.length > 1));

const polandTollRoads = [
    // ═══════════════ A1 (wg e-TOLL) ═══════════════
    {
        lengthMeters: 53200,
        from: 'Węzeł Rusocin',
        to: 'Węzeł Nowe Marzy',
        category: 'A',
        roadNumber: 'A1'
    },
    {
        lengthMeters: 63000,
        from: 'Węzeł Nowe Marzy',
        to: 'Węzeł Turzno',
        category: 'A',
        roadNumber: 'A1'
    },
    {
        lengthMeters: 25000,
        from: 'Węzeł Turzno',
        to: 'Węzeł Toruń Południe',
        category: 'A',
        roadNumber: 'A1'
    },
    {
        lengthMeters: 56000,
        from: 'Węzeł Toruń Południe',
        to: 'Węzeł Włocławek Zachód',
        category: 'A',
        roadNumber: 'A1'
    },
    {
        lengthMeters: 28000,
        from: 'Węzeł Włocławek Zachód',
        to: 'Węzeł Kowal',
        category: 'A',
        roadNumber: 'A1'
    },
    {
        lengthMeters: 56000,
        from: 'Węzeł Kowal',
        to: 'Węzeł Łódź Północ',
        category: 'A',
        roadNumber: 'A1'
    },
    {
        lengthMeters: 25000,
        from: 'Węzeł Łódź Północ',
        to: 'Węzeł Tuszyn',
        category: 'A',
        roadNumber: 'A1'
    },
    {
        lengthMeters: 36000,
        from: 'Węzeł Tuszyn',
        to: 'Węzeł Kamieńsk',
        category: 'A',
        roadNumber: 'A1'
    },
    {
        lengthMeters: 32000,
        from: 'Węzeł Kamieńsk',
        to: 'Węzeł Radomsko',
        category: 'A',
        roadNumber: 'A1'
    },
    {
        lengthMeters: 38000,
        from: 'Węzeł Radomsko',
        to: 'Węzeł Częstochowa',
        category: 'A',
        roadNumber: 'A1'
    },

    // ═══════════════ A2 ═══════════════
    {
        lengthMeters: 28300,
        from: 'Węzeł Konin Wschód',
        to: 'Węzeł Konin Zachód',
        category: 'A',
        roadNumber: 'A2'
    },
    {
        lengthMeters: 53200,
        from: 'Węzeł Konin Zachód',
        to: 'Węzeł Września',
        category: 'A',
        roadNumber: 'A2'
    },
    {
        lengthMeters: 28300,
        from: 'Węzeł Września',
        to: 'Węzeł Poznań Wschód',
        category: 'A',
        roadNumber: 'A2'
    },
    {
        lengthMeters: 12500,
        from: 'Węzeł Poznań Wschód',
        to: 'Węzeł Poznań Północ',
        category: 'A',
        roadNumber: 'A2'
    },
    {
        lengthMeters: 12500,
        from: 'Węzeł Poznań Północ',
        to: 'Węzeł Poznań Zachód',
        category: 'A',
        roadNumber: 'A2'
    },
    {
        lengthMeters: 28300,
        from: 'Węzeł Poznań Zachód',
        to: 'Węzeł Buk',
        category: 'A',
        roadNumber: 'A2'
    },
    {
        lengthMeters: 28300,
        from: 'Węzeł Buk',
        to: 'Węzeł Nowy Tomyśl',
        category: 'A',
        roadNumber: 'A2'
    },

    // ═══════════════ A4 ═══════════════
    {
        lengthMeters: 53200,
        from: 'Węzeł Zgorzelec',
        to: 'Węzeł Bolesławiec',
        category: 'A',
        roadNumber: 'A4'
    },
    {
        lengthMeters: 53200,
        from: 'Węzeł Bolesławiec',
        to: 'Węzeł Krzywa',
        category: 'A',
        roadNumber: 'A4'
    },
    {
        lengthMeters: 12500,
        from: 'Węzeł Krzywa',
        to: 'Węzeł Legnica Północ',
        category: 'A',
        roadNumber: 'A4'
    },
    {
        lengthMeters: 12500,
        from: 'Węzeł Legnica Północ',
        to: 'Węzeł Legnica Południe',
        category: 'A',
        roadNumber: 'A4'
    },
    {
        lengthMeters: 17800,
        from: 'Węzeł Legnica Południe',
        to: 'Węzeł Jawor',
        category: 'A',
        roadNumber: 'A4'
    },
    {
        lengthMeters: 28300,
        from: 'Węzeł Jawor',
        to: 'Węzeł Kostomłoty',
        category: 'A',
        roadNumber: 'A4'
    },
    {
        lengthMeters: 28300,
        from: 'Węzeł Kostomłoty',
        to: 'Węzeł Wrocław Psie Pole',
        category: 'A',
        roadNumber: 'A4'
    },
    {
        lengthMeters: 12500,
        from: 'Węzeł Wrocław Psie Pole',
        to: 'Węzeł Wrocław Kowale',
        category: 'A',
        roadNumber: 'A4'
    },
    {
        lengthMeters: 12500,
        from: 'Węzeł Wrocław Kowale',
        to: 'Węzeł Wrocław Sołtysowice',
        category: 'A',
        roadNumber: 'A4'
    },
    {
        lengthMeters: 12500,
        from: 'Węzeł Wrocław Sołtysowice',
        to: 'Węzeł Bielany Wrocławskie',
        category: 'A',
        roadNumber: 'A4'
    },
    {
        lengthMeters: 12500,
        from: 'Węzeł Bielany Wrocławskie',
        to: 'Węzeł Brzezimierz',
        category: 'A',
        roadNumber: 'A4'
    },
    {
        lengthMeters: 12500,
        from: 'Węzeł Brzezimierz',
        to: 'Węzeł Prądy',
        category: 'A',
        roadNumber: 'A4'
    },
    {
        lengthMeters: 28300,
        from: 'Węzeł Prądy',
        to: 'Węzeł Nogowczyce',
        category: 'A',
        roadNumber: 'A4'
    },
    {
        lengthMeters: 28300,
        from: 'Węzeł Nogowczyce',
        to: 'Węzeł Krapkowice',
        category: 'A',
        roadNumber: 'A4'
    },
    {
        lengthMeters: 12500,
        from: 'Węzeł Krapkowice',
        to: 'Węzeł Górażdże',
        category: 'A',
        roadNumber: 'A4'
    },
    {
        lengthMeters: 28300,
        from: 'Węzeł Górażdże',
        to: 'Węzeł Gliwice Sośnica',
        category: 'A',
        roadNumber: 'A4'
    },
    {
        lengthMeters: 12500,
        from: 'Węzeł Gliwice Sośnica',
        to: 'Węzeł Gliwice Ostropa',
        category: 'A',
        roadNumber: 'A4'
    },
    {
        lengthMeters: 12500,
        from: 'Węzeł Gliwice Ostropa',
        to: 'Węzeł Zabrze Północ',
        category: 'A',
        roadNumber: 'A4'
    },
    {
        lengthMeters: 12500,
        from: 'Węzeł Zabrze Północ',
        to: 'Węzeł Chorzów',
        category: 'A',
        roadNumber: 'A4'
    },
    {
        lengthMeters: 12500,
        from: 'Węzeł Chorzów',
        to: 'Węzeł Katowice Mikołowska',
        category: 'A',
        roadNumber: 'A4'
    },
    {
        lengthMeters: 12500,
        from: 'Węzeł Katowice Mikołowska',
        to: 'Węzeł Mysłowice',
        category: 'A',
        roadNumber: 'A4'
    },

    // ═══════════════ S3 ═══════════════
    {
        lengthMeters: 12500,
        from: 'Węzeł Lubawka',
        to: 'Węzeł Kamienna Góra Północ',
        category: 'S',
        roadNumber: 'S3'
    },
    {
        lengthMeters: 12500,
        from: 'Węzeł Kamienna Góra Północ',
        to: 'Węzeł Kamienna Góra Południe',
        category: 'S',
        roadNumber: 'S3'
    },
    {
        lengthMeters: 12500,
        from: 'Węzeł Kamienna Góra Południe',
        to: 'Węzeł Krzeszów',
        category: 'S',
        roadNumber: 'S3'
    },
    {
        lengthMeters: 17800,
        from: 'Węzeł Krzeszów',
        to: 'Węzeł Marciszów',
        category: 'S',
        roadNumber: 'S3'
    },

    // ═══════════════ S5 ═══════════════
    {
        lengthMeters: 12500,
        from: 'Węzeł Wrocław Pawłowice',
        to: 'Węzeł Kąty Wrocławskie',
        category: 'S',
        roadNumber: 'S5'
    },
    {
        lengthMeters: 28300,
        from: 'Węzeł Kąty Wrocławskie',
        to: 'Węzeł Jordanów Śląski',
        category: 'S',
        roadNumber: 'S5'
    },
    {
        lengthMeters: 28300,
        from: 'Węzeł Jordanów Śląski',
        to: 'Węzeł Łagiewniki',
        category: 'S',
        roadNumber: 'S5'
    },

    // ═══════════════ S6 ═══════════════
    {
        lengthMeters: 12500,
        from: 'Węzeł Gdańsk Południe',
        to: 'Węzeł Gdańsk Karczemki',
        category: 'S',
        roadNumber: 'S6'
    },
    {
        lengthMeters: 12500,
        from: 'Węzeł Gdańsk Karczemki',
        to: 'Węzeł Gdańsk Szadółki',
        category: 'S',
        roadNumber: 'S6'
    },

    // ═══════════════ S7 ═══════════════
    {
        lengthMeters: 12500,
        from: 'Węzeł Kraków Balice',
        to: 'Węzeł Kraków Tyniec',
        category: 'S',
        roadNumber: 'S7'
    },

    // ═══════════════ S8 ═══════════════
    {
        lengthMeters: 12500,
        from: 'Węzeł Wrocław Zachód',
        to: 'Węzeł Wrocław Południe',
        category: 'S',
        roadNumber: 'S8'
    },
    {
        lengthMeters: 12500,
        from: 'Węzeł Wrocław Południe',
        to: 'Węzeł Kąty Wrocławskie',
        category: 'S',
        roadNumber: 'S8'
    },
    {
        lengthMeters: 28300,
        from: 'Węzeł Kąty Wrocławskie',
        to: 'Węzeł Sobótka',
        category: 'S',
        roadNumber: 'S8'
    },
    {
        lengthMeters: 28300,
        from: 'Węzeł Sobótka',
        to: 'Węzeł Łagiewniki',
        category: 'S',
        roadNumber: 'S8'
    },

    // ═══════════════ S11 ═══════════════
    {
        lengthMeters: 12500,
        from: 'Węzeł Poznań Północ',
        to: 'Węzeł Poznań Wschód',
        category: 'S',
        roadNumber: 'S11'
    },

    // ═══════════════ S17 ═══════════════
    {
        lengthMeters: 28300,
        from: 'Węzeł Warszawa Lubelska',
        to: 'Węzeł Garwolin',
        category: 'S',
        roadNumber: 'S17'
    },

    // ═══════════════ DK12 ═══════════════
    {
        lengthMeters: 17800,
        from: 'Węzeł Piotrków Trybunalski Północ',
        to: 'Węzeł Radomsko Północ',
        category: 'G',
        roadNumber: 'DK12'
    },

    // ═══════════════ DK94 ═══════════════
    {
        lengthMeters: 1060,
        from: 'Przeworsk, ul. Grunwaldzka',
        to: 'Przeworsk, ul. Studziańska',
        category: 'G',
        roadNumber: 'DK94'
    },
    {
        lengthMeters: 2790,
        from: 'Przeworsk, ul. Mikołaja Kopernika',
        to: 'Przeworsk, ul. Grunwaldzka',
        category: 'G',
        roadNumber: 'DK94'
    },

    // ═══════════════ DK77 ═══════════════
    {
        lengthMeters: 2280,
        from: 'Węzeł Przemyśl',
        to: 'Radymno Skołoszów',
        category: 'G',
        roadNumber: 'DK77'
    },
    {
        lengthMeters: 2640,
        from: 'Munina',
        to: 'Jarosław, ul. Sanowa',
        category: 'G',
        roadNumber: 'DK77'
    }
];

async function seedPolandTolls() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const tollDocuments = polandTollRoads.map(road => {
            const lengthKm = road.lengthMeters / 1000;
            const ratePerKm = RATES_PER_KM[road.category];
            const basePrice = lengthKm * ratePerKm;

            // Отримати координати
            const fromCoords = NODE_COORDINATES[road.from];
            const toCoords = NODE_COORDINATES[road.to];

            if (fromCoords && toCoords &&
                fromCoords[0] === toCoords[0] &&
                fromCoords[1] === toCoords[1]) {
                console.warn(`⚠️ Identical coordinates for: ${road.from} - ${road.to}`);
                return null;
            }


            if (!fromCoords || !toCoords) {
                console.warn(`⚠️  Missing coordinates for: ${road.from} - ${road.to}`);
                return null;
            }

            return {
                name: `${road.roadNumber}: ${road.from} - ${road.to}`,
                country: 'PL',
                roadType: road.category === 'A' ? 'highway' : 'expressway',
                roadNumber: road.roadNumber,
                lengthKm: parseFloat(lengthKm.toFixed(2)),
                geometry: {
                    type: 'LineString',
                    coordinates: [fromCoords, toCoords]
                },
                pricing: [
                    {
                        vehicleClass: 'car',
                        price: parseFloat(basePrice.toFixed(2)),
                        currency: 'PLN',
                        pricingType: 'fixed',
                        description: `Category ${road.category}: ${ratePerKm} PLN/km`
                    },
                    {
                        vehicleClass: 'van',
                        price: parseFloat((basePrice * 1.5).toFixed(2)),
                        currency: 'PLN',
                        pricingType: 'fixed'
                    },
                    {
                        vehicleClass: 'truck',
                        price: parseFloat((basePrice * 3).toFixed(2)),
                        currency: 'PLN',
                        pricingType: 'fixed'
                    }
                ],
                paymentMethods: ['electronic_tag'],
                active: true,
                category: road.category,
                etollSystem: true,
                updatedAt: new Date()
            };
        }).filter(doc => doc !== null);

        // Видалити старі польські дороги
        await TollRoad.deleteMany({country: 'PL'});
        console.log('🗑️  Cleared existing Polish toll roads');


        // Додати нові
        const result = await TollRoad.insertMany(tollDocuments);
        console.log(`✅ Inserted ${result.length} Polish toll roads`);

        // Статистика
        const stats = tollDocuments.reduce((acc, road) => {
            acc[road.category] = (acc[road.category] || 0) + 1;
            return acc;
        }, {});

        console.log('\n📊 Statistics:');
        console.log(`   Category A (Autostrada): ${stats.A || 0}`);
        console.log(`   Category S (Droga ekspresowa): ${stats.S || 0}`);
        console.log(`   Category G (Droga krajowa): ${stats.G || 0}`);

        mongoose.connection.close();
        console.log('\n👋 Done!');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    seedPolandTolls();
}

module.exports = seedPolandTolls;
