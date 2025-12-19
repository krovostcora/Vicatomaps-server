// services/vehicleService.js
const Vehicle = require('../models/Vehicle');

class VehicleService {
    /**
     * Get all predefined vehicles
     */
    async getAllVehicles() {
        try {
            const vehicles = await Vehicle.find().sort({ _id: 1 });
            return vehicles;
        } catch (error) {
            console.error('Error fetching vehicles:', error.message);
            throw new Error('Failed to fetch vehicles');
        }
    }

    /**
     * Get vehicle by ID
     */
    async getVehicleById(vehicleId) {
        try {
            console.log(`Fetching vehicle with ID: ${vehicleId}`);
            const vehicle = await Vehicle.findById(vehicleId).lean();

            if (!vehicle) {
                console.log(`Vehicle not found with ID: ${vehicleId}`);
                return null;
            }

            console.log(`Vehicle fetched from DB:`, vehicle);
            return vehicle;
        } catch (error) {
            console.error('Error fetching vehicle:', error.message);
            throw new Error('Failed to fetch vehicle');
        }
    }

    /**
     * Get vehicles by fuel type
     */
    async getVehiclesByFuelType(fuelType) {
        try {
            const vehicles = await Vehicle.find({ fuelType }).sort({ _id: 1 });
            return vehicles;
        } catch (error) {
            console.error('Error fetching vehicles by fuel type:', error.message);
            throw new Error('Failed to fetch vehicles by fuel type');
        }
    }

    /**
     * Create a new vehicle
     */
    async createVehicle(vehicleData) {
        try {
            const vehicle = new Vehicle(vehicleData);
            await vehicle.save();
            return vehicle;
        } catch (error) {
            console.error('Error creating vehicle:', error.message);
            throw new Error('Failed to create vehicle');
        }
    }

    /**
     * Update vehicle
     */
    async updateVehicle(vehicleId, vehicleData) {
        try {
            const vehicle = await Vehicle.findByIdAndUpdate(
                vehicleId,
                vehicleData,
                { new: true, runValidators: true }
            );
            return vehicle;
        } catch (error) {
            console.error('Error updating vehicle:', error.message);
            throw new Error('Failed to update vehicle');
        }
    }

    /**
     * Initialize default vehicles (for MVP)
     */
    async initializeDefaultVehicles() {
        const defaultVehicles = [
            {
                name: 'Compact Car (Petrol)',
                fuelType: 'petrol',
                consumption: 6.5,
                tankSize: 45,
                description: 'Small city car, efficient for short trips'
            },
            {
                name: 'Mid-size Sedan (Diesel)',
                fuelType: 'diesel',
                consumption: 5.8,
                tankSize: 55,
                description: 'Comfortable sedan, good for long distances'
            },
            {
                name: 'SUV (Petrol)',
                fuelType: 'petrol',
                consumption: 9.2,
                tankSize: 70,
                description: 'Large family vehicle with more space'
            },
            {
                name: 'Electric Vehicle',
                fuelType: 'electric',
                consumption: 18,
                tankSize: 60,
                description: 'Zero emissions electric vehicle'
            },
            {
                name: 'Sedan (LPG)',
                fuelType: 'lpg',
                consumption: 8.5,
                tankSize: 50,
                description: 'LPG-powered vehicle, lower fuel costs'
            }
        ];

        try {
            await Vehicle.bulkWrite(
                defaultVehicles.map(vehicleData => ({
                    updateOne: {
                        filter: { name: vehicleData.name },
                        update: { $set: vehicleData },
                        upsert: true
                    }
                }))
            );
            console.log('Default vehicles initialized');
        } catch (error) {
            console.error('Error initializing default vehicles:', error.message);
            throw error;
        }
    }
}

module.exports = new VehicleService();
