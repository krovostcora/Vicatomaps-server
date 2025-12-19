// TODO - UNUSED: This model is not imported anywhere in the codebase.
//                UserTrip.js is used instead (simpler schema).
//                Consider removing this file or merging useful features into UserTrip.

// src/models/Trip.js
const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
    lat: {
        type: Number,
        required: true
    },
    lon: {
        type: Number,
        required: true
    },
    address: {
        type: String
    }
}, { _id: false });

const countryBreakdownSchema = new mongoose.Schema({
    countryCode: String,
    country: String,
    pricePerLiter: Number,
    liters: Number,
    cost: Number
}, { _id: false });

const tripSchema = new mongoose.Schema({
    // Trip owner
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Vehicle
    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true
    },

    // Route
    origin: {
        type: locationSchema,
        required: true
    },

    destination: {
        type: locationSchema,
        required: true
    },

    waypoints: [locationSchema],

    // Route parameters
    distance: {
        type: Number,  // meters
        required: true
    },

    duration: {
        type: Number,  // seconds
        required: true
    },

    // Countries on route
    countries: [{
        type: String
    }],

    // Fuel cost
    fuelCost: {
        total: {
            type: Number,
            required: true
        },
        totalLiters: {
            type: Number,
            required: true
        },
        breakdown: [countryBreakdownSchema]
    },

    // Toll cost
    tollCost: {
        type: Number,
        default: 0
    },

    // Total cost
    totalCost: {
        type: Number,
        required: true
    },

    // Currency
    currency: {
        type: String,
        default: 'EUR'
    },

    // TODO - UNUSED: For future features
    notes: {
        type: String
    },

    isFavorite: {
        type: Boolean,
        default: false
    },

    // If user enters actual cost after trip
    actualCost: {
        type: Number
    }
}, {
    timestamps: true
});

// Indexes for fast lookup
tripSchema.index({ userId: 1, createdAt: -1 });
tripSchema.index({ userId: 1, isFavorite: 1 });

// Virtual fields
tripSchema.virtual('distanceKm').get(function() {
    return (this.distance / 1000).toFixed(2);
});

tripSchema.virtual('durationHours').get(function() {
    return (this.duration / 3600).toFixed(2);
});

// Methods
tripSchema.methods.toSummary = function() {
    return {
        id: this._id,
        origin: this.origin.address || `${this.origin.lat}, ${this.origin.lon}`,
        destination: this.destination.address || `${this.destination.lat}, ${this.destination.lon}`,
        distance: this.distanceKm + ' km',
        duration: this.durationHours + ' hours',
        totalCost: this.totalCost,
        currency: this.currency,
        date: this.createdAt
    };
};

const Trip = mongoose.model('Trip', tripSchema);

module.exports = Trip;
