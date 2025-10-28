const mongoose = require('mongoose');

const tollRoadSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    country: {
        type: String,
        required: true,
        index: true,
    },
    roadType: {
        type: String,
        enum: ['highway', 'tunnel', 'bridge', 'vignette'],
        required: true,
    },
    geometry: {
        type: {
            type: String,
            enum: ['LineString', 'Point'],
            required: true,
        },
        coordinates: {
            type: [],
            required: true,
        },
    },
    pricing: [{
        vehicleClass: {
            type: String,
            enum: ['car', 'van', 'truck', 'motorcycle'],
            required: true,
        },
        price: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            default: 'EUR',
        },
        pricingType: {
            type: String,
            enum: ['per_km', 'fixed', 'daily', 'weekly', 'monthly', 'yearly'],
            default: 'fixed',
        },
    }],
    paymentMethods: [{
        type: String,
        enum: ['cash', 'card', 'electronic_tag', 'online'],
    }],
    active: {
        type: Boolean,
        default: true,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

tollRoadSchema.index({ geometry: '2dsphere' });

module.exports = mongoose.model('TollRoad', tollRoadSchema);