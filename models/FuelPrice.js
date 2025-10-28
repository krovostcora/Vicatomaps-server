const mongoose = require('mongoose');

const fuelPriceSchema = new mongoose.Schema({
    country: {
        type: String,
        required: true,
        index: true,
    },
    region: {
        type: String,
        default: null,
    },
    city: {
        type: String,
        default: null,
    },
    fuelType: {
        type: String,
        enum: ['petrol_95', 'petrol_98', 'diesel', 'lpg', 'electric'],
        required: true,
    },
    pricePerLiter: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        default: 'EUR',
    },
    stationName: {
        type: String,
        default: null,
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            index: '2dsphere',
        },
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    source: {
        type: String,
        default: 'manual',
    },
});

fuelPriceSchema.index({ country: 1, fuelType: 1, updatedAt: -1 });

module.exports = mongoose.model('FuelPrice', fuelPriceSchema);