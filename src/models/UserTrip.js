// models/UserTrip.js
const mongoose = require('mongoose');

const countryBreakdownSchema = new mongoose.Schema({
    countryCode: String,
    country: String,
    pricePerLiter: Number,
    liters: Number,
    cost: Number
}, { _id: false });

const userTripSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    origin: {
        type: String,
        required: true
    },
    destination: {
        type: String,
        required: true
    },

    originCoords: {
        lat: Number,
        lon: Number
    },

    destinationCoords: {
        lat: Number,
        lon: Number
    },

    waypoints: [{
        type: String,
        trim: true
    }],

    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true
    },

    totalCost: {
        type: Number,
        required: true,
        min: 0
    },

    totalDistance: {
        type: Number,
        required: true,
        min: 0
    },

    fuelCost: {
        type: Number,
        min: 0
    },

    // Detailed breakdown by country (optional)
    fuelBreakdown: [countryBreakdownSchema],

    tollCost: {
        type: Number,
        min: 0
    },

    duration: {
        type: Number,
        min: 0
    },

    // Countries on route
    countries: [{
        type: String
    }],

    routeData: {
        type: mongoose.Schema.Types.Mixed
    },

    googleMapsUrl: {
        type: String
    },

    // TODO - UNUSED: For future features
    notes: {
        type: String
    },

    isFavorite: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Indexes for fast lookup
userTripSchema.index({ userId: 1, createdAt: -1 });
userTripSchema.index({ userId: 1, isFavorite: 1 });

// Virtual fields
userTripSchema.virtual('distanceKm').get(function() {
    return (this.totalDistance / 1000).toFixed(2);
});

userTripSchema.virtual('durationHours').get(function() {
    return (this.duration / 3600).toFixed(2);
});

module.exports = mongoose.model('UserTrip', userTripSchema);
