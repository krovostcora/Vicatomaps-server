// src/models/FuelPrice.js
const mongoose = require('mongoose');

const fuelPriceSchema = new mongoose.Schema({
    countryCode: {
        type: String,
        required: true,
        uppercase: true
    },
    country: {
        type: String,
        required: true
    },
    gasoline: {
        type: Number,
        default: null
    },
    diesel: {
        type: Number,
        default: null
    },
    lpg: {
        type: Number,
        default: null
    }
}, {
    timestamps: true
});

fuelPriceSchema.index({ countryCode: 1 }, { unique: true });

module.exports = mongoose.model('FuelPrice', fuelPriceSchema);
