// scripts/initDatabase.js
require('dotenv').config();
const { connectDB, mongoose } = require('../src/config/database');
const vehicleService = require('../src/services/vehicleService');
const fuelPriceService = require('../src/services/fuelPriceService');

const initializeDatabase = async () => {
    try {
        console.log('Starting database initialization...');

        // Connect to MongoDB
        await connectDB();
        console.log('Connected to MongoDB');

        // Initialize vehicles
        console.log('Initializing default vehicles...');
        await vehicleService.initializeDefaultVehicles();
        console.log('Vehicles initialized');

        // TODO: Prices are polled from external provider. Uncomment below only if you want default
        //       fallback prices and implement fuelPriceService.initializeDefaultPrices() first.
        //
        // // Initialize fuel prices
        // console.log('Initializing default fuel prices...');
        // await fuelPriceService.initializeDefaultPrices();
        // console.log('Fuel prices initialized');

        // Verify initialization
        const vehicleCount = await mongoose.connection.collection('vehicles').countDocuments();
        const fuelPriceCount = await mongoose.connection.collection('fuelprices').countDocuments();

        console.log('\nDatabase Statistics:');
        console.log(`\t- Vehicles: ${vehicleCount}`);
        console.log(`\t- Fuel Prices: ${fuelPriceCount}`);

        console.log('\nDatabase initialization completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
};

// Run initialization
initializeDatabase();
