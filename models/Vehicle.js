const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    manufacturer: {
        type: String,
        required: true,
    },
    model: {
        type: String,
        required: true,
    },
    year: {
        type: Number,
        required: true,
    },
    fuelType: {
        type: String,
        enum: ['petrol_95', 'petrol_98', 'diesel', 'lpg', 'electric', 'hybrid'],
        required: true,
    },
    fuelConsumption: {
        city: {
            type: Number, // L/100km or kWh/100km
            required: true,
        },
        highway: {
            type: Number,
            required: true,
        },
        combined: {
            type: Number,
            required: true,
        },
    },
    vehicleClass: {
        type: String,
        enum: ['car', 'van', 'truck', 'motorcycle'],
        default: 'car',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

vehicleSchema.index({ manufacturer: 1, model: 1, year: 1 });

module.exports = mongoose.model('Vehicle', vehicleSchema);