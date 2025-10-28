const mongoose = require('mongoose');
const FuelPrice = require('../models/FuelPrice');
const TollRoad = require('../models/TollRoad');
const Vehicle = require('../models/Vehicle');

async function populateDatabase() {
    await mongoose.connect(process.env.MONGODB_URI);

    // Sample Fuel Prices
    const fuelPrices = [
        {
            country: 'LT',
            fuelType: 'diesel',
            pricePerLiter: 1.45,
            currency: 'EUR',
            updatedAt: new Date(),
        },
        {
            country: 'PL',
            fuelType: 'diesel',
            pricePerLiter: 1.38,
            currency: 'EUR',
            updatedAt: new Date(),
        },
        {
            country: 'DE',
            fuelType: 'diesel',
            pricePerLiter: 1.65,
            currency: 'EUR',
            updatedAt: new Date(),
        },
    ];

    await FuelPrice.insertMany(fuelPrices);

    // Sample Vehicles
    const vehicles = [
        {
            manufacturer: 'Volkswagen',
            model: 'Golf',
            year: 2020,
            fuelType: 'diesel',
            fuelConsumption: {
                city: 5.5,
                highway: 4.2,
                combined: 4.8,
            },
            vehicleClass: 'car',
        },
        {
            manufacturer: 'BMW',
            model: '320d',
            year: 2021,
            fuelType: 'diesel',
            fuelConsumption: {
                city: 6.0,
                highway: 4.5,
                combined: 5.2,
            },
            vehicleClass: 'car',
        },
    ];

    await Vehicle.insertMany(vehicles);

    console.log('Database populated successfully');
    process.exit(0);
}

populateDatabase().catch(console.error);