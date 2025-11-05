// models/FuelPrice.js
const mongoose = require('mongoose');

const fuelPriceSchema = new mongoose.Schema({
    countryCode: {
        type: String,
        required: true,
        uppercase: true,
        length: 2
    },
    fuelType: {
        type: String,
        required: true,
        enum: ['petrol', 'diesel', 'electric'],
        lowercase: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'EUR',
        uppercase: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index for efficient lookups
fuelPriceSchema.index({ countryCode: 1, fuelType: 1 }, { unique: true });

module.exports = mongoose.model('FuelPrice', fuelPriceSchema);