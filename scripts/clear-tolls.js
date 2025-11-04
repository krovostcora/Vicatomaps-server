const mongoose = require('mongoose');
const TollRoad = require('../src/models/TollRoad');
require('dotenv').config();

async function clearTolls(country) {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const query = country ? { country: country.toUpperCase() } : {};
        const result = await TollRoad.deleteMany(query);

        console.log(`✅ Deleted ${result.deletedCount} toll roads`);

        mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// node src/scripts/clear-tolls.js FR
const country = process.argv[2];
clearTolls(country);