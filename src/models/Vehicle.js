// models/Vehicle.js
const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    fuelType: {
        type: String,
        required: true,
        enum: ['petrol', 'diesel', 'electric'],
        lowercase: true
    },
    consumption: {
        type: Number,
        required: true,
        min: 0
    },
    tankSize: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String,
        trim: true
    }
}, {
    timestamps: true,
    // Ensure virtuals and all fields are included when converting to JSON
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

module.exports = mongoose.model('Vehicle', vehicleSchema);