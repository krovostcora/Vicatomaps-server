const mongoose = require('mongoose');
const seedPolandTolls = require('./Poland/poland.seed');
const seedFranceTolls = require('./France/france.seed');
const seedItalyTolls = require('./Italy/italy.seed');
require('dotenv').config();

async function seedAll() {
    try {
        console.log('🌱 Starting seed process...\n');

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Seed Poland
        console.log('🇵🇱 Seeding Poland toll roads...');
        await seedPolandTolls();
        console.log('');

        // Seed France
        console.log('🇫🇷 Seeding France toll roads...');
        await seedFranceTolls();
        console.log('');

        // Seed Italy
        console.log('🇮🇹 Seeding Italy toll roads...');
        console.log(' Seeding Italy toll roads...');
        await seedItalyTolls();
        console.log('');

        mongoose.connection.close();
        console.log('✅ All seeds completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    }
}

seedAll();