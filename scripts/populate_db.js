const mongoose = require('mongoose');
require('dotenv').config();

// Define schemas inline for this script
const vehicleSchema = new mongoose.Schema({
    manufacturer: String,
    model: String,
    year: Number,
    fuelType: String,
    fuelConsumption: {
        city: Number,
        highway: Number,
        combined: Number,
    },
    vehicleClass: String,
});

const fuelPriceSchema = new mongoose.Schema({
    country: String,
    fuelType: String,
    pricePerLiter: Number,
    currency: String,
    updatedAt: Date,
});

const Vehicle = mongoose.model('Vehicle', vehicleSchema);
const FuelPrice = mongoose.model('FuelPrice', fuelPriceSchema);

async function populateDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing data
        await Vehicle.deleteMany({});
        await FuelPrice.deleteMany({});

        // Add vehicles
        const vehicles = [
            {
                manufacturer: 'Volkswagen',
                model: 'Golf',
                year: 2020,
                fuelType: 'diesel',
                fuelConsumption: { city: 5.5, highway: 4.2, combined: 4.8 },
                vehicleClass: 'car',
            },
            {
                manufacturer: 'BMW',
                model: '320d',
                year: 2021,
                fuelType: 'diesel',
                fuelConsumption: { city: 6.0, highway: 4.5, combined: 5.2 },
                vehicleClass: 'car',
            },
            {
                manufacturer: 'Toyota',
                model: 'Corolla',
                year: 2022,
                fuelType: 'petrol_95',
                fuelConsumption: { city: 6.2, highway: 4.8, combined: 5.4 },
                vehicleClass: 'car',
            },
            {
                manufacturer: 'Tesla',
                model: 'Model 3',
                year: 2023,
                fuelType: 'electric',
                fuelConsumption: { city: 15.0, highway: 18.0, combined: 16.5 },
                vehicleClass: 'car',
            },
        ];

        await Vehicle.insertMany(vehicles);
        console.log('✅ Vehicles added');

        // Add fuel prices
        const fuelPrices = [
            { country: 'LT', fuelType: 'diesel', pricePerLiter: 1.45, currency: 'EUR', updatedAt: new Date() },
            { country: 'LT', fuelType: 'petrol_95', pricePerLiter: 1.52, currency: 'EUR', updatedAt: new Date() },
            { country: 'PL', fuelType: 'diesel', pricePerLiter: 1.38, currency: 'EUR', updatedAt: new Date() },
            { country: 'DE', fuelType: 'diesel', pricePerLiter: 1.65, currency: 'EUR', updatedAt: new Date() },
        ];

        await FuelPrice.insertMany(fuelPrices);
        console.log('✅ Fuel prices added');

        console.log('🎉 Database populated successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

populateDatabase();