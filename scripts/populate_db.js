const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const Vehicle = require('../models/Vehicle');

async function populateDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing vehicles
    await Vehicle.deleteMany({});
    console.log('🗑️ Cleared existing vehicles');

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
        manufacturer: 'Mercedes',
        model: 'C220d',
        year: 2021,
        fuelType: 'diesel',
        fuelConsumption: { city: 5.8, highway: 4.3, combined: 5.0 },
        vehicleClass: 'car',
      },
      {
        manufacturer: 'Audi',
        model: 'A4 TDI',
        year: 2020,
        fuelType: 'diesel',
        fuelConsumption: { city: 5.9, highway: 4.4, combined: 5.1 },
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
      {
        manufacturer: 'Ford',
        model: 'Focus',
        year: 2019,
        fuelType: 'petrol_95',
        fuelConsumption: { city: 6.5, highway: 4.9, combined: 5.6 },
        vehicleClass: 'car',
      },
      {
        manufacturer: 'Volkswagen',
        model: 'Passat',
        year: 2021,
        fuelType: 'diesel',
        fuelConsumption: { city: 6.2, highway: 4.6, combined: 5.3 },
        vehicleClass: 'car',
      },
    ];

    await Vehicle.insertMany(vehicles);
    console.log(`✅ ${vehicles.length} vehicles added`);

    console.log('🎉 Database populated successfully!');
    console.log(`📊 Total: ${vehicles.length} vehicles in database`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

populateDatabase();